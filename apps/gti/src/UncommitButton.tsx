import { DOCUMENTATION_DELAY, Tooltip } from "./Tooltip";
import { UncommitOperation } from "./operations/Uncommit";
import {
  latestCommitTreeMap,
  latestHeadCommit,
  useRunOperation,
} from "./serverAPIState";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { observer } from "mobx-react-lite";

export const UncommitButton = observer(() => {
  // TODO: use treeWithPreviews instead,
  // otherwise there's bugs with disabling this button during previews
  const headCommit = latestHeadCommit.get();
  const treeMap = latestCommitTreeMap.get();
  const runOperation = useRunOperation();
  if (!headCommit) {
    return null;
  }
  const headTree = treeMap.get(headCommit.branch);
  if (!headTree || headTree.children.length) {
    // if the head commit has children, we can't uncommit
    return null;
  }
  return (
    <Tooltip
      delayMs={DOCUMENTATION_DELAY}
      title={
        "Remove this commit, but keep its changes as uncommitted changes, as if you never ran commit."
      }
    >
      <VSCodeButton
        onClick={() => runOperation(new UncommitOperation(headCommit))}
        appearance="secondary"
      >
        <>Uncommit</>
      </VSCodeButton>
    </Tooltip>
  );
});
