/* eslint-disable camelcase */
import { getInput, setFailed, setOutput, info } from "@actions/core";
import { getOctokit } from "@actions/github";
import debug from "debug";

const dbg = debug("action-is-issue-on-board:index");

export async function run(): Promise<void> {
  dbg("Check whether issue is on the board");
  try {
    dbg("Retrieve inputs");
    const token = getInput("token", { required: true });
    const owner = getInput("owner", { required: true });
    const board = getInput("board", { required: true });
    const repo = getInput("repo", { required: true });
    const number_input = getInput("number", { required: false });
    const number = Number.parseInt(number_input, 10);

    dbg("Inputs: %s, %s, %s, %d", owner, board, repo, number);

    const query = `
    fragment RepoOfIssue on Repository { name url }
    fragment Project on Project { id name columns(first: 10) {
      nodes { id name cards(first: 100) { nodes { id content { 
              ... on Issue { title number id repository { ...RepoOfIssue } }
              ... on PullRequest { title number id repository { ...RepoOfIssue }                }
            }
          }
        }
      }}
    }
    
    query($owner: String!, $board: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) { name projects(search: $board, first: 100) { nodes { ...Project } } }
      organization(login: $owner) { name projects(search: $board, first: 100) { nodes { ...Project } } }
    }    
    `;

    interface GqlCardResult {
      id: string;
      content?: {
        title: string;
        number: number;
        repository: {
          name: string;
          url: string;
        };
      };
    }

    interface GqlColumnResult {
      name: string;
      id: string;
      cards: {
        nodes: GqlCardResult[];
      };
    }

    interface GqlProjectResult {
      name: string;
      id: string;
      columns: {
        nodes: GqlColumnResult[];
      };
    }

    interface GqlProjectHolderResult {
      name: string;
      projects: { nodes: GqlProjectResult[] };
    }

    interface GqlResult {
      repository: GqlProjectHolderResult | null;
      organization: {
        name: string;
        projects: { nodes: GqlProjectResult[] };
      };
    }

    const client = getOctokit(token);
    const data = await client.graphql<GqlResult>({ query, owner, board, repo });

    dbg("Search On result");
    let column: GqlColumnResult | undefined;
    let card: GqlCardResult | undefined;
    let issue: GqlCardResult["content"];
    const project =
      data.repository?.projects.nodes.find((p) => p.name === board) ||
      data.organization.projects.nodes.find((p) => p.name === board);

    if (!project) {
      setOutput("isOnBoard", false);
      setFailed(`Project Board ${board} was not found`);
      return;
    }

    const found = project?.columns.nodes.find((col) =>
      col.cards.nodes.find((crd) => {
        if (crd.content?.number === number) {
          column = col;
          card = crd;
          issue = crd.content;
          return true;
        }
        return false;
      })
    );

    setOutput("boardId", project.name);
    setOutput("boardName", project.id);

    if (found) {
      dbg(
        "Issue %s is added to %s in %s",
        issue?.number,
        project?.name,
        data.repository?.name
      );
      info(`Issue: ${issue?.number} is on Board: ${project?.name}`);

      setOutput("isOnBoard", true);
      setOutput("repo", issue?.repository.name);
      setOutput("cardId", card?.id);
      setOutput("columnId", column?.id);
      setOutput("columnName", column?.name);
    } else {
      info(`Issue: ${number} is not on Board: ${board}`);

      setOutput("isOnBoard", false);
      setOutput("repo", undefined);
      setOutput("cardId", undefined);
      setOutput("columnId", undefined);
      setOutput("columnName", undefined);
    }
  } catch (e) {
    dbg("Failed:", e);
    setFailed(e.message);
  }
}

export default run();
