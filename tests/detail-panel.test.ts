// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DetailPanel } from "../src/features/structure/DetailPanel";
import { useAppStore } from "../src/state/store";
import { emptyLayout, type GsnElement } from "../src/core/model/types";
let container: HTMLDivElement, root: Root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  useAppStore.setState(useAppStore.getInitialState(), true);
  const node: GsnElement = {filePath:"case/G1.md",gsnId:"G1",gkType:"GsnGoal",name:"Claim",statement:"Original",isRoot:true,undeveloped:true,supportedBy:[],inContextOf:[],hasEvidence:[]};
  useAppStore.setState({selectedId:"G1",structure:{rootId:"G1",rootDir:"case",elements:new Map([["G1",node]]),evidence:new Map(),layout:emptyLayout("G1")}});
  container=document.createElement("div"); document.body.append(container); root=createRoot(container);
  act(()=>root.render(createElement(DetailPanel)));
});
afterEach(()=>{act(()=>root.unmount());container.remove();});
function typeStatement(value:string){
  const textarea=container.querySelector("textarea")!;
  act(()=>{ Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value")!.set!.call(textarea,value); textarea.dispatchEvent(new Event("input",{bubbles:true})); });
}
it("preserves unapplied statement drafts when an undeveloped flag changes",()=>{
  typeStatement("Draft claim retained");
  act(()=>container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  expect(container.querySelector("textarea")!.value).toBe("Draft claim retained");
  expect(useAppStore.getState().structure!.elements.get("G1")!.statement).toBe("Original");
  const apply=[...container.querySelectorAll("button")].find(b=>b.textContent==="Apply node edits")!;
  act(()=>apply.click());
  expect(useAppStore.getState().structure!.elements.get("G1")!.statement).toBe("Draft claim retained");
});
it("preserves draft statements across evidence association changes",()=>{
  act(()=>useAppStore.setState(s=>({structure:{...s.structure!,elements:new Map([["G1",{...s.structure!.elements.get("G1")!,gkType:"GsnSolution",undeveloped:false}]]),evidence:new Map([["Evidence/source.md",{filePath:"Evidence/source.md",name:"Source",statement:"Recorded source",kind:"Document"}]])}})));
  typeStatement("Evidence-linked draft");
  act(()=>container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  expect(container.querySelector("textarea")!.value).toBe("Evidence-linked draft");
  expect(useAppStore.getState().structure!.elements.get("G1")!.hasEvidence).toEqual(["Evidence/source"]);
});

it.each(["Evidence/source.md", "source", "Evidence/source"])("can detach the resolved evidence reference %s", (reference) => {
  act(()=>useAppStore.setState(s=>({structure:{...s.structure!,elements:new Map([["G1",{...s.structure!.elements.get("G1")!,gkType:"GsnSolution",undeveloped:false,hasEvidence:[reference]}]]),evidence:new Map([["Evidence/source.md",{filePath:"Evidence/source.md",name:"Source",statement:"Recorded source",kind:"Document"}]])}})));
  const checkbox=container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  expect(checkbox.checked).toBe(true);
  act(()=>checkbox.click());
  expect(useAppStore.getState().structure!.elements.get("G1")!.hasEvidence).toEqual([]);
});
