import { Editor, Monaco, OnChange } from '@monaco-editor/react';
import { shallow } from 'zustand/shallow';
import { useEffect, useState } from 'react';
import { useCodeDaemon } from '../../state-managers/code-daemon/code-daemon.store';
import * as theme from './theme.json';
import { useCommands } from '../../commands/use-command.hook';
import tableTemplate from '../../../std/completion-templates/table-template';
import collectionTemplate from '../../../std/completion-templates/collection-template';
import keyvalueTemplate from '../../../std/completion-templates/keyvalue-template';
import injectableTemplate from '../../../std/completion-templates/injectable-template';
import compilerOptions from '../../../compiler/compiler-options';

export default function (props: { onChange: OnChange }) {
	const [monacoRef, setMonacoRef] = useState<Monaco>();
	const { useProject, useIDE, stores } = useCodeDaemon(
		(state) => ({ useProject: state.useProject, useIDE: state.useIDE, stores: state.stores }),
		shallow
	);
	const { fileSystemSizeChangeVersion } = useProject(
		(state) => ({
			fileSystemSizeChangeVersion: state.fileSystemSizeChangeVersion,
		}),
		shallow
	);
	const { setMonaco, setEditor, activeFilePath } = useIDE(
		(state) => ({
			activeFilePath: state.activeFilePath,
			setMonaco: state.setMonaco,
			setEditor: state.setEditor,
			editor: state.editor,
		}),
		shallow
	);

	const {
		ide: { refreshIDE, syncMonacoModels, getActiveFile },
	} = useCommands();

	useEffect(() => {
		if (!monacoRef) {
			return;
		}

		monacoRef.editor.defineTheme('theme', theme as any);
		monacoRef.editor.setTheme('theme');
		monacoRef.languages.typescript.typescriptDefaults.setCompilerOptions({
			...(compilerOptions as any),
			noLib: true,
		});

		setMonaco(monacoRef);
		syncMonacoModels();

		const { dispose } = monacoRef.languages.registerCompletionItemProvider('typescript', {
			provideCompletionItems(model, position, context, token) {
				const word = model.getWordUntilPosition(position);
				const range = {
					startLineNumber: position.lineNumber,
					endLineNumber: position.lineNumber,
					startColumn: word.startColumn,
					endColumn: word.endColumn,
				};
				return {
					suggestions: [
						{
							label: 'table',
							insertText: tableTemplate,
							documentation: `Creates a new class representing a relational db table`,

							kind: monacoRef.languages.CompletionItemKind.Function,
							range,
						},
						{
							label: 'collection',
							insertText: collectionTemplate,
							documentation: `Creates a new class representing a NoSQL collection`,

							kind: monacoRef.languages.CompletionItemKind.Function,
							range,
						},
						{
							label: 'keyvalue',
							insertText: keyvalueTemplate,
							documentation: `Creates a new class representing a KeyValue store`,

							kind: monacoRef.languages.CompletionItemKind.Function,
							range,
						},
						{
							label: 'service',
							insertText: injectableTemplate,
							documentation: `Creates a new class representing a Service`,

							kind: monacoRef.languages.CompletionItemKind.Function,
							range,
						},
					],
				};
			},
		});

		return dispose;
	}, [monacoRef]);

	useEffect(() => {
		syncMonacoModels();
	}, [fileSystemSizeChangeVersion]);

	useEffect(() => {
		refreshIDE();
	}, [activeFilePath]);

	const activeFile = getActiveFile();
	return (
		<Editor
			theme="theme"
			height="100%"
			width="100%"
			language="typescript"
			value={activeFile?.content}
			path={activeFile?.fullPath || 'empty.ts'}
			options={{
				fontSize: 18,
				fontWeight: '500',
				fontFamily: 'Fira Mono',
				minimap: {
					enabled: false,
				},
				overviewRulerLanes: 0,
				lineNumbersMinChars: 2,
			}}
			beforeMount={(monaco) => {
				setMonacoRef(monaco);
			}}
			onMount={setEditor}
			onChange={props.onChange}
		/>
	);
}
