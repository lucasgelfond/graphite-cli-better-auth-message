import { execCliCommand } from "../../test/utils/exec_cli_command";
import GitRepo from "../../test/utils/git_repo";
import AbstractDemo from "./abstract_demo";

export default class DiffDemo extends AbstractDemo {
  constructor() {
    super(
      "diff",
      [
        "# First, lets show the current stacks",
        "gp stacks",
        'echo "new change" > ./frontend_change',
        "git add ./frontend_change",
        "gp diff -b 'gr--frontend' -m 'feat(frontend): add review queue filter frontend'",
        "# Now, lets see the stacks after diff-ing",
        "gp stacks",
        "sleep 5",
      ],
      (demoDir: string): void => {
        const repo = new GitRepo(demoDir);

        repo.createChangeAndCommit("First commit");
        repo.createChangeAndCommit("Second commit");

        repo.createChange("[Product] Add review queue filter api");
        execCliCommand(
          "diff -b 'tr--api' -m '[Product] Add review queue filter api'",
          { fromDir: demoDir }
        );

        repo.createChange("[Product] Add review queue filter server");
        execCliCommand(
          "diff -b 'tr--server' -m '[Product] Add review queue filter server'",
          { fromDir: demoDir }
        );

        repo.checkoutBranch("main");

        repo.createChange("[Bug Fix] Fix crashes on reload");
        execCliCommand(
          "diff -b 'tr--fix_crash' -m '[Bug Fix] Fix crashes on reload'",
          { fromDir: demoDir }
        );

        repo.checkoutBranch("main");

        repo.createChange("[Bug Fix] Account for empty state");
        execCliCommand(
          "diff -b 'tr--account_for_empty_state' -m '[Bug Fix] Account for empty state'",
          { fromDir: demoDir }
        );

        repo.checkoutBranch("tr--server");
      }
    );
  }
}