/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { sleep } from '../utilities/sleep';
import { CodeSymbolInformationEmbeddings, CodeSymbolKind } from '../utilities/types';
import { callServerEventStreamingBufferedGET, callServerEventStreamingBufferedPOST } from './ssestream';
import { ConversationMessage, DeepContextForView, InEditorRequest, InEditorTreeSitterDocumentationQuery, InEditorTreeSitterDocumentationReply, InLineAgentMessage, RepoStatus, SemanticSearchResponse, SnippetInformation, TextDocument } from './types';
import { SelectionDataForExplain } from '../utilities/getSelectionContext';

export enum RepoRefBackend {
	local = 'local',
	github = 'github',
}


export class RepoRef {
	private _path: string;
	private _backend: RepoRefBackend;

	constructor(
		path: string,
		backend: RepoRefBackend
	) {
		this._path = path;
		this._backend = backend;
	}

	getRepresentation(): string {
		return `${this._backend}/${this._path}`;
	}

	getPath(): string {
		return this._path;
	}
}


export class SideCarClient {
	private _url: string;

	constructor(
		url: string
	) {
		this._url = url;
	}

	getRepoListUrl(): string {
		const baseUrl = new URL(this._url);
		baseUrl.pathname = '/api/repo/repo_list';
		return baseUrl.toString();
	}

	async getRangeForDiagnostics(textDocumentWeb: TextDocument, snippetInformation: SnippetInformation, thresholdToExpand: number) {
		const baseUrl = new URL(this._url);
		baseUrl.pathname = '/api/tree_sitter/diagnostic_parsing';
		const body = {
			text_document_web: textDocumentWeb,
			range: snippetInformation,
			threshold_to_expand: thresholdToExpand,
		};
		const url = baseUrl.toString();
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});
		const responseJson = await response.json();
		console.log(responseJson);
	}

	async getSymbolsForGoToDefinition(codeSnippet: string, repoRef: RepoRef, threadId: string, language: string): Promise<string[]> {
		const baseUrl = new URL(this._url);
		baseUrl.pathname = '/api/agent/goto_definition_symbols';
		const body = {
			repo_ref: repoRef.getRepresentation(),
			code_snippet: codeSnippet,
			thread_id: threadId,
			language: language,
		};
		const url = baseUrl.toString();
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});
		const responseJson = await response.json();
		const symbols = responseJson.symbols as string[];
		return symbols;
	}


	async *getInLineEditorResponse(context: InEditorRequest): AsyncIterableIterator<InLineAgentMessage> {
		console.log('getInLineEditorResponse');
		const baseUrl = new URL(this._url);
		baseUrl.pathname = '/api/in_editor/answer';
		console.log('getInLineEditorResponse');
		console.log(context);
		const url = baseUrl.toString();
		const asyncIterableResponse = await callServerEventStreamingBufferedPOST(url, context);
		for await (const line of asyncIterableResponse) {
			const lineParts = line.split('data:{');
			for (const lineSinglePart of lineParts) {
				const lineSinglePartTrimmed = lineSinglePart.trim();
				if (lineSinglePartTrimmed === '') {
					continue;
				}
				const inlineAgentMessage = JSON.parse('{' + lineSinglePartTrimmed) as InLineAgentMessage;
				yield inlineAgentMessage;
			}
		}
	}

	async getParsedComments(context: InEditorTreeSitterDocumentationQuery): Promise<InEditorTreeSitterDocumentationReply> {
		const baseUrl = new URL(this._url);
		baseUrl.pathname = '/api/tree_sitter/documentation_parsing';
		const url = baseUrl.toString();
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(context),
		});
		const responseJson = await response.json();
		return responseJson as InEditorTreeSitterDocumentationReply;
	}

	async *followupQuestion(query: string, repoRef: RepoRef, threadId: string): AsyncIterableIterator<ConversationMessage> {
		const baseUrl = new URL(this._url);
		baseUrl.pathname = '/api/agent/followup_chat';
		const url = baseUrl.toString();
		const body = {
			repo_ref: repoRef.getRepresentation(),
			query: query,
			thread_id: threadId,
		};
		const asyncIterableResponse = await callServerEventStreamingBufferedPOST(url, body);
		for await (const line of asyncIterableResponse) {
			const lineParts = line.split('data:{');
			for (const lineSinglePart of lineParts) {
				const lineSinglePartTrimmed = lineSinglePart.trim();
				if (lineSinglePartTrimmed === '') {
					continue;
				}
				const conversationMessage = JSON.parse('{' + lineSinglePartTrimmed) as ConversationMessage;
				console.log(conversationMessage);
				yield conversationMessage;
			}
		}
	}

	async *explainQuery(query: string, repoRef: RepoRef, selection: SelectionDataForExplain, threadId: string): AsyncIterableIterator<ConversationMessage> {
		const baseUrl = new URL(this._url);
		baseUrl.pathname = '/api/agent/explain';
		baseUrl.searchParams.set('repo_ref', repoRef.getRepresentation());
		baseUrl.searchParams.set('query', query);
		baseUrl.searchParams.set('start_line', selection.lineStart.toString());
		baseUrl.searchParams.set('end_line', selection.lineEnd.toString());
		baseUrl.searchParams.set('relative_path', selection.relativeFilePath);
		baseUrl.searchParams.set('thread_id', threadId);
		const url = baseUrl.toString();
		const asyncIterableResponse = await callServerEventStreamingBufferedGET(url);
		for await (const line of asyncIterableResponse) {
			const lineParts = line.split('data:{');
			for (const lineSinglePart of lineParts) {
				const lineSinglePartTrimmed = lineSinglePart.trim();
				if (lineSinglePartTrimmed === '') {
					continue;
				}
				const conversationMessage = JSON.parse('{' + lineSinglePartTrimmed) as ConversationMessage;
				yield conversationMessage;
			}
		}
	}

	async *searchQuery(query: string, repoRef: RepoRef, threadId: string): AsyncIterableIterator<ConversationMessage> {
		// how do we create the url properly here?
		const baseUrl = new URL(this._url);
		baseUrl.pathname = '/api/agent/search_agent';
		baseUrl.searchParams.set('reporef', repoRef.getRepresentation());
		baseUrl.searchParams.set('query', query);
		baseUrl.searchParams.set('thread_id', threadId);
		const url = baseUrl.toString();
		const asyncIterableResponse = await callServerEventStreamingBufferedGET(url);
		for await (const line of asyncIterableResponse) {
			// Now these responses can be parsed properly, since we are using our
			// own reader over sse, sometimes the reader might send multiple events
			// in a single line so we should split the lines by \n to get the
			// individual lines
			// console.log(line);
			// Is this a good placeholder? probably not, cause we can have instances
			// of this inside the string too, but for now lets check if this works as
			// want it to
			const lineParts = line.split('data:{');
			for (const lineSinglePart of lineParts) {
				const lineSinglePartTrimmed = lineSinglePart.trim();
				if (lineSinglePartTrimmed === '') {
					continue;
				}
				const conversationMessage = JSON.parse('{' + lineSinglePartTrimmed) as ConversationMessage;
				console.log('[search][stream] whats the message from the stream');
				console.log(conversationMessage);
				yield conversationMessage;
			}
		}
	}

	async indexRepositoryIfNotInvoked(repoRef: RepoRef): Promise<boolean> {
		// First get the list of indexed repositories
		await this.waitForGreenHC();
		console.log('fetching the status of the various repositories');
		const response = await fetch(this.getRepoListUrl());
		const repoList = (await response.json()) as RepoStatus;
		console.log(repoList);
		if (!(repoRef.getRepresentation() in repoList.repo_map)) {
			// We need to index this repository
			const baseUrl = new URL(this._url);
			baseUrl.pathname = '/api/repo/sync';
			baseUrl.searchParams.set('repo', repoRef.getRepresentation());
			const url = baseUrl.toString();
			const response = await fetch(url);
			const responseJson = await response.json();
			return responseJson.status === 'ok';
		} else {
			// We don't need to index this repository
			return true;
		}
	}

	async waitForGreenHC(): Promise<boolean> {
		const baseUrl = new URL(this._url);
		baseUrl.pathname = '/api/health';
		let attempts = 0;
		const totalAttempts = 10;
		while (true) {
			try {
				console.log('trying to HC for repo check');
				const url = baseUrl.toString();
				const response = await fetch(url);
				return response.status === 200;
			} catch (e) {
				// sleeping for a attempts * second here
				await sleep(1000 * (attempts + 1));
				attempts = attempts + 1;
				if (attempts < totalAttempts) {
					continue;
				} else {
					throw e;
				}
			}
		}
	}

	async getSemanticSearchResult(query: string, reporef: RepoRef): Promise<CodeSymbolInformationEmbeddings[]> {
		const baseUrl = new URL(this._url);
		baseUrl.pathname = '/api/agent/hybrid_search';
		baseUrl.searchParams.set('repo', reporef.getRepresentation());
		baseUrl.searchParams.set('query', query);
		const url = baseUrl.toString();
		const response = await fetch(url);
		const responseJson = await response.json();
		const semanticSearchResult = responseJson as SemanticSearchResponse;
		const codeSymbols = semanticSearchResult.code_spans;
		const sortedCodeSymbols = codeSymbols.sort((a, b) => {
			if (b.score !== null && a.score !== null) {
				return b.score - a.score;
			}
			if (b.score !== null && a.score === null) {
				return 1;
			}
			if (b.score === null && a.score !== null) {
				return -1;
			}
			return 0;
		});
		const codeSymbolInformationEmbeddings: CodeSymbolInformationEmbeddings[] = sortedCodeSymbols.map((codeSpan) => {
			const filePath = path.join(reporef.getPath(), codeSpan.file_path);
			return {
				codeSymbolInformation: {
					symbolName: '',
					symbolKind: CodeSymbolKind.null,
					symbolStartLine: codeSpan.start_line,
					symbolEndLine: codeSpan.end_line,
					codeSnippet: {
						languageId: 'typescript',
						code: codeSpan.data,
					},
					extraSymbolHint: null,
					dependencies: [],
					fsFilePath: filePath,
					originalFilePath: filePath,
					workingDirectory: reporef.getPath(),
					displayName: '',
					originalName: '',
					originalSymbolName: '',
					globalScope: 'global',
				},
				codeSymbolEmbedding: [],
				fileHash: '',
			};
		});
		return codeSymbolInformationEmbeddings;
	}
}