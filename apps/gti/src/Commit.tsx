import type { SuccessorInfo } from "./types";

import { gtiDrawerState } from "./App";
import { BranchIndicator } from "./CommitTreeList";
import { Tooltip } from "./Tooltip";
import { UncommitButton } from "./UncommitButton";
import { UncommittedChanges } from "./UncommittedChanges";
import { DiffInfo } from "./codeReview/DiffBadge";
import { isDescendant } from "./getCommitTree";
import { GotoOperation } from "./operations/GotoOperation";
import { HideOperation } from "./operations/HideOperation";
import { RebaseOperation } from "./operations/RebaseOperation";
import platform from "./platform";
import { CommitPreview, operationBeingPreviewed } from "./previews";
import { RelativeDate } from "./relativeDate";
import { useCommitSelection } from "./selection";
import {
  isFetchingUncommittedChanges,
  latestCommitTreeMap,
  latestUncommittedChanges,
  useRunOperation,
  useRunPreviewedOperation,
} from "./serverAPIState";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { memo, useCallback } from "react";
import { useContextMenu } from "@withgraphite/gti-shared/ContextMenu";
import { Icon } from "@withgraphite/gti-shared/Icon";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import type { BranchInfo } from "@withgraphite/gti-cli-shared-types";
import { highlightedCommits } from "./HighlightedCommits";
import { notEmpty } from "@withgraphite/gti-shared/utils";
import { hasUnsavedEditedCommitMessage } from "./CommitInfoState";

function isDraggablePreview(previewType?: CommitPreview): boolean {
  switch (previewType) {
    // dragging preview descendants would be confusing (it would reset part of your drag),
    // you probably meant to drag the root.
    case CommitPreview.REBASE_DESCENDANT:
    // old commits are already being dragged
    // eslint-disable-next-line no-fallthrough
    case CommitPreview.REBASE_OLD:
    case CommitPreview.HIDDEN_ROOT:
    case CommitPreview.HIDDEN_DESCENDANT:
    case CommitPreview.NON_ACTIONABLE_COMMIT:
      return false;

    // you CAN let go of the preview and drag it again
    case CommitPreview.REBASE_ROOT:
    // optimistic rebase commits act like normal, they can be dragged just fine
    // eslint-disable-next-line no-fallthrough
    case CommitPreview.REBASE_OPTIMISTIC_DESCENDANT:
    case CommitPreview.REBASE_OPTIMISTIC_ROOT:
    case undefined:
    // other unrelated previews are draggable
    // eslint-disable-next-line no-fallthrough
    default:
      return true;
  }
}

/**
 * Some preview types should not allow actions on top of them
 * For example, you can't click goto on the preview of dragging a rebase,
 * but you can goto on the optimistic form of a running rebase.
 */
function previewPreventsActions(preview?: CommitPreview): boolean {
  switch (preview) {
    case CommitPreview.REBASE_OLD:
    case CommitPreview.REBASE_DESCENDANT:
    case CommitPreview.REBASE_ROOT:
    case CommitPreview.HIDDEN_ROOT:
    case CommitPreview.HIDDEN_DESCENDANT:
      return true;
  }
  return false;
}

export const Commit = memo(
  observer(
    ({
      commit,
      previewType,
      hasChildren,
    }: {
      commit: BranchInfo;
      previewType?: CommitPreview;
      hasChildren: boolean;
    }) => {
      const isPublic = commit.partOfTrunk;

      const handlePreviewedOperation = useRunPreviewedOperation();
      const runOperation = useRunOperation();
      const isHighlighted = highlightedCommits.has(commit.branch);

      const { isSelected, onClickToSelect } = useCommitSelection(commit.branch);
      const actionsPrevented = previewPreventsActions(previewType);

      const isNonActionable =
        previewType === CommitPreview.NON_ACTIONABLE_COMMIT;

      function onDoubleClickToShowDrawer(e: React.MouseEvent<HTMLDivElement>) {
        // Select the commit if it was deselected.
        if (!isSelected) {
          onClickToSelect(e);
        }
        // Show the drawer.
        runInAction(() => {
          const state = gtiDrawerState.get();
          gtiDrawerState.set({
            ...state,
            right: {
              ...state.right,
              collapsed: false,
            },
          });
        });
      }

      const contextMenu = useContextMenu(() => {
        return [
          {
            label: <>Copy branch name "{commit?.branch}"</>,
            onClick: () => platform.clipboardCopy(commit.branch),
          },
          {
            label: <>Untrack branch and descendants</>,
            onClick: () =>
              operationBeingPreviewed.set(new HideOperation(commit.branch)),
          },
        ];
      });

      return (
        <div
          className={
            "commit" +
            (commit.isHead ? " head-commit" : "") +
            (isHighlighted ? " highlighted" : "")
          }
          data-testid={`commit-${commit.branch}`}
        >
          {!isNonActionable &&
          (commit.isHead ||
            previewType === CommitPreview.GOTO_PREVIOUS_LOCATION) ? (
            <HeadCommitInfo
              commit={commit}
              previewType={previewType}
              hasChildren={hasChildren}
            />
          ) : null}
          <div className="commit-rows">
            {isSelected ? (
              <div
                className="selected-commit-background"
                data-testid="selected-commit"
              />
            ) : null}
            <DraggableCommit
              className={
                "commit-details" +
                (previewType != null ? ` commit-preview-${previewType}` : "")
              }
              commit={commit}
              draggable={!isPublic && isDraggablePreview(previewType)}
              onClick={onClickToSelect}
              onContextMenu={contextMenu}
              onDoubleClick={onDoubleClickToShowDrawer}
            >
              <div className="commit-avatar" />
              <span className="commit-title">
                <span>{commit.title || commit.branch}</span>
                <CommitDate rawDate={commit.date} />
              </span>
              <UnsavedEditedMessageIndicator commit={commit} />
              {previewType === CommitPreview.REBASE_OPTIMISTIC_ROOT ? (
                <span className="commit-inline-operation-progress">
                  <Icon icon="loading" /> <>rebasing...</>
                </span>
              ) : null}
              {previewType === CommitPreview.REBASE_ROOT ? (
                <>
                  <VSCodeButton
                    appearance="secondary"
                    onClick={() => handlePreviewedOperation(/* cancel */ true)}
                  >
                    <>Cancel</>
                  </VSCodeButton>
                  <VSCodeButton
                    appearance="primary"
                    onClick={() => handlePreviewedOperation(/* cancel */ false)}
                  >
                    <>Run Rebase</>
                  </VSCodeButton>
                </>
              ) : null}
              {previewType === CommitPreview.HIDDEN_ROOT ? (
                <>
                  <VSCodeButton
                    appearance="secondary"
                    onClick={() => handlePreviewedOperation(/* cancel */ true)}
                  >
                    <>Cancel</>
                  </VSCodeButton>
                  <VSCodeButton
                    appearance="primary"
                    onClick={() => handlePreviewedOperation(/* cancel */ false)}
                  >
                    <>Hide</>
                  </VSCodeButton>
                </>
              ) : null}
              {actionsPrevented || commit.isHead ? null : (
                <span className="goto-button">
                  <VSCodeButton
                    appearance="secondary"
                    onClick={(event) => {
                      runOperation(new GotoOperation(commit.branch));
                      event.stopPropagation(); // don't select commit
                    }}
                  >
                    <>Goto</> <Icon icon="arrow-right" />
                  </VSCodeButton>
                </span>
              )}
              {!isPublic && !actionsPrevented && commit.isHead ? (
                <UncommitButton />
              ) : null}
            </DraggableCommit>
            <DivIfChildren className="commit-second-row">
              {commit.pr && !isPublic ? (
                <DiffInfo diffId={commit.pr.number} />
              ) : null}
            </DivIfChildren>
          </div>
        </div>
      );
    }
  )
);

function CommitDate({ rawDate }: { rawDate: string }) {
  const date = new Date(rawDate);

  return (
    <span className="commit-date">
      <RelativeDate date={date} useShortVariant />
    </span>
  );
}

const DivIfChildren = observer(
  ({
    children,
    ...props
  }: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  >) => {
    if (
      !children ||
      (Array.isArray(children) && children.filter(notEmpty).length === 0)
    ) {
      return null;
    }
    return <div {...props}>{children}</div>;
  }
);

const UnsavedEditedMessageIndicator = observer(
  ({ commit }: { commit: BranchInfo }) => {
    const isEdted = hasUnsavedEditedCommitMessage(commit.branch).get();
    if (!isEdted) {
      return null;
    }
    return (
      <div
        className="unsaved-message-indicator"
        data-testid="unsaved-message-indicator"
      >
        <Tooltip title={"This commit has unsaved changes to its message"}>
          <Icon icon="circle-large-filled" />
        </Tooltip>
      </div>
    );
  }
);

const HeadCommitInfo = observer(
  ({
    commit,
    previewType,
    hasChildren,
  }: {
    commit: BranchInfo;
    previewType?: CommitPreview;
    hasChildren: boolean;
  }) => {
    const uncommittedChanges = latestUncommittedChanges.get();

    // render head info indented when:
    //  - we have uncommitted changes, so we're showing files
    // and EITHER
    //    - we're on a public commit (you'll create a new "branch" by committing)
    //    - the commit we're rendering has children (we'll render the current child as new branch after committing)
    const indent =
      uncommittedChanges.length > 0 && (commit.partOfTrunk || hasChildren);

    return (
      <div
        className={`head-commit-info-container${
          indent ? " head-commit-info-indented" : ""
        }`}
      >
        <YouAreHere previewType={previewType} />
        {
          commit.isHead ? (
            <div className="head-commit-info">
              <UncommittedChanges place="main" />
            </div>
          ) : null // don't show uncommitted changes twice while checking out
        }
        {indent ? <BranchIndicator /> : null}
      </div>
    );
  }
);

export const YouAreHere = observer(
  ({
    previewType,
    hideSpinner,
  }: {
    previewType?: CommitPreview;
    hideSpinner?: boolean;
  }) => {
    const isFetching = isFetchingUncommittedChanges.get() && !hideSpinner;

    let text;
    let spinner = false;
    switch (previewType) {
      case CommitPreview.GOTO_DESTINATION:
        text = <>You're moving here...</>;
        spinner = true;
        break;
      case CommitPreview.GOTO_PREVIOUS_LOCATION:
        text = <>You were here...</>;
        spinner = true;
        break;
      default:
        text = <>You are here</>;
        break;
    }
    return (
      <div className="you-are-here-container">
        <span className="you-are-here">
          {spinner ? <Icon icon="loading" /> : null}
          {text}
        </span>
        {isFetching ? <Icon icon="loading" /> : null}
      </div>
    );
  }
);

let commitBeingDragged: BranchInfo | undefined = undefined;

function preventDefault(e: Event) {
  e.preventDefault();
}
function handleDragEnd(event: Event) {
  event.preventDefault();

  commitBeingDragged = undefined;
  const draggedDOMNode = event.target;
  draggedDOMNode?.removeEventListener("dragend", handleDragEnd);
  document.removeEventListener("drop", preventDefault);
  document.removeEventListener("dragover", preventDefault);
}

const DraggableCommit = observer(
  ({
    commit,
    children,
    className,
    draggable,
    onClick,
    onDoubleClick,
    onContextMenu,
  }: {
    commit: BranchInfo;
    children: React.ReactNode;
    className: string;
    draggable: boolean;
    onClick?: (
      e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
    ) => unknown;
    onDoubleClick?: (e: React.MouseEvent<HTMLDivElement>) => unknown;
    onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
  }) => {
    const handleDragEnter = useCallback(() => {
      const treeMap = latestCommitTreeMap.get();

      if (
        commitBeingDragged != null &&
        commit.branch !== commitBeingDragged.branch
      ) {
        const draggedTree = treeMap.get(commitBeingDragged.branch);
        if (draggedTree) {
          if (
            // can't rebase a commit onto its descendants
            !isDescendant(commit.branch, draggedTree) &&
            // can't rebase a commit onto its parent... it's already there!
            !(commitBeingDragged.parents as Array<string>).includes(
              commit.branch
            )
          ) {
            // if the dest commit has a remote bookmark, use that instead of the hash.
            // this is easier to understand in the command history and works better with optimistic state
            const destination = commit.branch;
            operationBeingPreviewed.set(
              new RebaseOperation(commitBeingDragged.branch, destination)
            );
          }
        }
      }
    }, [commit]);

    const handleDragStart = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        // can't rebase with uncommitted changes
        const loadable = latestUncommittedChanges.get();
        const hasUncommittedChanges = loadable.length > 0;

        if (hasUncommittedChanges) {
          event.preventDefault();
        }

        commitBeingDragged = commit;
        event.dataTransfer.dropEffect = "none";

        const draggedDOMNode = event.target;
        // prevent animation of commit returning to drag start location on drop
        draggedDOMNode.addEventListener("dragend", handleDragEnd);
        document.addEventListener("drop", preventDefault);
        document.addEventListener("dragover", preventDefault);
      },
      [commit]
    );

    return (
      <div
        className={className}
        onDragStart={handleDragStart}
        onDragEnter={handleDragEnter}
        draggable={draggable}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onKeyPress={(event) => {
          if (event.key === "Enter") {
            onClick?.(event);
          }
        }}
        onContextMenu={onContextMenu}
        tabIndex={0}
        data-testid={"draggable-commit"}
      >
        {children}
      </div>
    );
  }
);

export function SuccessorInfoToDisplay({
  successorInfo,
}: {
  successorInfo: SuccessorInfo;
}) {
  switch (successorInfo.type) {
    case "land":
    case "pushrebase":
      return <>Landed as a newer commit</>;
    case "amend":
      return <>Amended as a newer commit'</>;
    case "rebase":
      return <>Rebased as a newer commit'</>;
    case "split":
      return <>Split as a newer commit'</>;
    case "fold":
      return <>Folded as a newer commit'</>;
    case "histedit":
      return <>Histedited as a newer commit'</>;
    default:
      return <>Rewritten as a newer commit'</>;
  }
}
