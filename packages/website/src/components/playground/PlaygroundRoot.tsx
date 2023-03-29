import { useWindowSize } from '@docusaurus/theme-common';
import type * as ESQuery from 'esquery';
import React, { useEffect, useRef, useState } from 'react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

import ASTViewer from '../ast/ASTViewer';
import ConfigEslint from '../config/ConfigEslint';
import ConfigTypeScript from '../config/ConfigTypeScript';
import LoadingEditor from '../editor/LoadingEditor';
import useHashState from '../hooks/useHashState';
import EditorTabs from '../layout/EditorTabs';
import { createFileSystem } from '../linter/bridge';
import type { UpdateModel } from '../linter/types';
import { isCodeFile, isEslintrcFile, isTSConfigFile } from '../linter/utils';
import { TypesDetails } from '../typeDetails/TypesDetails';
import { defaultConfig, detailTabs } from './config';
import { ErrorsViewer } from './ErrorsViewer';
import { ESQueryFilter } from './ESQueryFilter';
import OptionsSelector from './OptionsSelector';
import styles from './playground.module.css';
import type { ErrorGroup, PlaygroundSystem } from './types';

function PlaygroundRoot(): JSX.Element {
  const [config, setConfig] = useHashState(defaultConfig);

  const [system] = useState<PlaygroundSystem>(() => createFileSystem(config));
  const [activeFile, setFileName] = useState(`file.${config.fileType}`);
  const [editorFile, setEditorFile] = useState(`file.${config.fileType}`);

  const [errors, setErrors] = useState<ErrorGroup[]>([]);
  const [astModel, setAstModel] = useState<UpdateModel>();
  const [esQueryFilter, setEsQueryFilter] = useState<ESQuery.Selector>();
  const [showModal, setShowModal] = useState<string | false>(false);
  const [selectedRange, setSelectedRange] = useState<[number, number]>();
  const [cursorPosition, onCursorChange] = useState<number>();
  const playgroundMenuRef = useRef<ImperativePanelHandle>(null);

  // TODO: should we auto disable this on mobile
  const [enableScrolling, setEnableScrolling] = useState<boolean>(true);

  const windowSize = useWindowSize();

  useEffect(() => {
    const dispose = system.watchFile(
      '/*',
      fileName => {
        if (isCodeFile(fileName)) {
          setConfig({ code: system.readFile(fileName) });
        } else if (isEslintrcFile(fileName)) {
          setConfig({ eslintrc: system.readFile(fileName) });
        } else if (isTSConfigFile(fileName)) {
          setConfig({ tsconfig: system.readFile(fileName) });
        }
      },
      500,
    );
    return () => {
      dispose.close();
    };
  }, [setConfig, system]);

  useEffect(() => {
    const newFile = `file.${config.fileType}`;
    if (newFile !== editorFile) {
      if (editorFile === activeFile) {
        setFileName(newFile);
      }
      setEditorFile(newFile);
    }
  }, [config, system, editorFile, activeFile]);

  useEffect(() => {
    if (windowSize === 'mobile') {
      playgroundMenuRef.current?.collapse();
    } else if (windowSize === 'desktop') {
      playgroundMenuRef.current?.expand();
    }
  }, [windowSize, playgroundMenuRef]);

  return (
    <>
      <ConfigEslint
        system={system}
        isOpen={showModal === '.eslintrc'}
        onClose={setShowModal}
      />
      <ConfigTypeScript
        system={system}
        isOpen={showModal === 'tsconfig.json'}
        onClose={setShowModal}
      />
      <PanelGroup
        className={styles.panelGroup}
        autoSaveId="playground-resize"
        direction={windowSize === 'mobile' ? 'vertical' : 'horizontal'}
      >
        <Panel
          id="playgroundMenu"
          className={styles.PanelRow}
          defaultSize={20}
          minSize={10}
          collapsible={true}
          ref={playgroundMenuRef}
        >
          <OptionsSelector
            config={config}
            setConfig={setConfig}
            enableScrolling={enableScrolling}
            setEnableScrolling={setEnableScrolling}
          />
        </Panel>
        <PanelResizeHandle
          className={styles.PanelResizeHandle}
          style={windowSize === 'mobile' ? { display: 'none' } : {}}
        />
        <Panel
          id="playgroundEditor"
          className={styles.PanelRow}
          collapsible={true}
        >
          <div className={styles.playgroundEditor}>
            <EditorTabs
              tabs={[editorFile, '.eslintrc', 'tsconfig.json']}
              active={activeFile}
              change={setFileName}
              showModal={setShowModal}
              showVisualEditor={activeFile !== editorFile}
            />
            <LoadingEditor
              tsVersion={config.ts}
              onUpdate={setAstModel}
              system={system}
              activeFile={activeFile}
              onValidate={setErrors}
              onCursorChange={onCursorChange}
              selectedRange={selectedRange}
            />
          </div>
        </Panel>
        <PanelResizeHandle className={styles.PanelResizeHandle} />
        <Panel
          id="playgroundInfo"
          className={styles.PanelRow}
          defaultSize={50}
          collapsible={true}
        >
          <div className={styles.playgroundInfoContainer}>
            <div className={styles.playgroundInfoHeader}>
              <EditorTabs
                tabs={detailTabs}
                active={config.showAST ?? false}
                change={(v): void => setConfig({ showAST: v })}
              />
              {config.showAST === 'es' && (
                <ESQueryFilter onChange={setEsQueryFilter} />
              )}
            </div>
            <div className={styles.playgroundInfo}>
              {!config.showAST || !astModel ? (
                <ErrorsViewer value={errors} />
              ) : config.showAST === 'types' && astModel.storedTsAST ? (
                <TypesDetails
                  typeChecker={astModel.typeChecker}
                  value={astModel.storedTsAST}
                  onHoverNode={setSelectedRange}
                  cursorPosition={cursorPosition}
                />
              ) : (
                <ASTViewer
                  key={config.showAST}
                  filter={config.showAST === 'es' ? esQueryFilter : undefined}
                  value={
                    config.showAST === 'ts'
                      ? astModel.storedTsAST
                      : config.showAST === 'scope'
                      ? astModel.storedScope
                      : astModel.storedAST
                  }
                  enableScrolling={enableScrolling}
                  cursorPosition={cursorPosition}
                  onHoverNode={setSelectedRange}
                />
              )}
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </>
  );
}

export default PlaygroundRoot;