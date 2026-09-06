import editorContractSource from "./examples/editor-contract.example.ts?raw";
import { inputScene } from "./examples/input-scene.example";
import mapEditorHostSource from "./examples/map-editor-host.example.ts?raw";
import parentPageSource from "./examples/parent-page.example.ts?raw";

export const sceneInputExample = JSON.stringify(inputScene, null, 2);
export const messageSchemaExample = editorContractSource;
export const parentHostExample = mapEditorHostSource;
export const resultUsageExample = parentPageSource;
