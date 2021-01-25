/* eslint-disable @typescript-eslint/no-explicit-any */
import { getInput, info, setFailed, setOutput } from "@actions/core";
import { getOctokit } from "@actions/github";
import { GqlResult, run } from "./action";

jest.mock("@actions/core");
jest.mock("@actions/github");

const getInputMock = getInput as jest.MockedFunction<typeof getInput>;
const setFailedMock = setFailed as jest.MockedFunction<typeof setFailed>;
const getOctokitMock = getOctokit as jest.MockedFunction<typeof getOctokit>;
const infoMock = info as jest.MockedFunction<typeof info>;
const setOutputMock = setOutput as jest.MockedFunction<typeof setOutput>;

const octokit = {
  graphql: jest.fn() as jest.Mock<Promise<GqlResult>, any>,
};

describe("action", () => {
  beforeEach(() => {
    process.env.GITHUB_EVENT_PATH = "fixtures/review.submitted.event.json";

    getOctokitMock.mockReturnValue(octokit as any);
    getInputMock.mockReturnValueOnce("THE TOKEN");
    getInputMock.mockReturnValueOnce("the-owner");
    getInputMock.mockReturnValueOnce("the-board");
    getInputMock.mockReturnValueOnce("the-repo");
    getInputMock.mockReturnValueOnce("666");
    octokit.graphql.mockResolvedValue({
      repository: {
        name: "the-repo",
        projects: {
          nodes: [
            {
              id: "projectid",
              name: "the-board",
              columns: {
                nodes: [
                  {
                    id: "colid",
                    name: "The Column",
                    cards: {
                      nodes: [
                        {
                          id: "blabla",
                          content: {
                            title: "The Issue",
                            repository: {
                              name: "the-repo",
                              url: "https://foo.bar",
                            },
                            number: 666,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      organization: { name: "the-org", projects: { nodes: [] } },
    });
  });

  it("Happy Path", async () => {
    await expect(run()).resolves.toBeUndefined();

    expect(getInputMock).toHaveBeenCalledTimes(5);
    expect(getInputMock.mock.calls.map((c) => c[0])).toEqual([
      "token",
      "owner",
      "board",
      "repo",
      "number",
    ]);

    expect(getOctokitMock).toHaveBeenCalledTimes(1);
    expect(getOctokitMock).toHaveBeenCalledWith("THE TOKEN");

    expect(octokit.graphql).toHaveBeenCalledWith({
      board: "the-board",
      owner: "the-owner",
      query: `
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
    `,
      repo: "the-repo",
    });

    expect(setOutputMock).toHaveBeenCalledTimes(7);
    expect(setOutputMock.mock.calls.map((c) => c.join(": "))).toMatchSnapshot(
      "Output"
    );

    expect(infoMock).toHaveBeenCalledTimes(1);
    expect(infoMock).toHaveBeenCalledWith("Issue: 666 is on Board: the-board");

    expect(setFailedMock).not.toHaveBeenCalled();
  });

  it("Use Project from org", async () => {
    octokit.graphql.mockResolvedValue({
      repository: null,
      organization: {
        name: "the-org",
        projects: {
          nodes: [
            {
              id: "projectid",
              name: "the-board",
              columns: {
                nodes: [
                  {
                    id: "colid",
                    name: "The Column",
                    cards: {
                      nodes: [
                        {
                          id: "thenone",
                          content: undefined,
                        },
                        {
                          id: "blabla",
                          content: {
                            title: "The Issue",
                            repository: {
                              name: "the-repo",
                              url: "https://foo.bar",
                            },
                            number: 666,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    });

    await expect(run()).resolves.toBeUndefined();

    expect(getInputMock).toHaveBeenCalledTimes(5);
    expect(getInputMock.mock.calls.map((c) => c[0])).toEqual([
      "token",
      "owner",
      "board",
      "repo",
      "number",
    ]);

    expect(getOctokitMock).toHaveBeenCalledTimes(1);
    expect(getOctokitMock).toHaveBeenCalledWith("THE TOKEN");

    expect(octokit.graphql).toHaveBeenCalledWith({
      board: "the-board",
      owner: "the-owner",
      query: `
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
    `,
      repo: "the-repo",
    });

    expect(setOutputMock).toHaveBeenCalledTimes(7);
    expect(setOutputMock.mock.calls.map((c) => c.join(": "))).toMatchSnapshot(
      "Output"
    );

    expect(infoMock).toHaveBeenCalledTimes(1);
    expect(infoMock).toHaveBeenCalledWith("Issue: 666 is on Board: the-board");

    expect(setFailedMock).not.toHaveBeenCalled();
  });

  it("Should fail on error", async () => {
    octokit.graphql.mockRejectedValue(new Error("The FOO"));

    await expect(run()).resolves.toBeUndefined();

    expect(setOutputMock).not.toHaveBeenCalled();
    expect(infoMock).not.toHaveBeenCalled();

    expect(setFailedMock).toHaveBeenCalledTimes(1);
    expect(setFailedMock).toHaveBeenCalledWith("The FOO");
  });

  it("Should fail on no project", async () => {
    octokit.graphql.mockResolvedValue({
      repository: null,
      organization: { name: "the-org", projects: { nodes: [] } },
    });

    await expect(run()).resolves.toBeUndefined();

    expect(setOutputMock).toHaveBeenCalledTimes(1);
    expect(setOutputMock).toHaveBeenCalledWith("isOnBoard", false);
    expect(infoMock).not.toHaveBeenCalled();

    expect(setFailedMock).toHaveBeenCalledTimes(1);
    expect(setFailedMock).toHaveBeenCalledWith(
      "Project Board the-board was not found"
    );
  });

  it("Should process not found", async () => {
    octokit.graphql.mockResolvedValue({
      repository: null,
      organization: {
        name: "the-org",
        projects: {
          nodes: [
            {
              id: "projectid",
              name: "the-board",
              columns: { nodes: [] },
            },
          ],
        },
      },
    });

    await expect(run()).resolves.toBeUndefined();

    expect(getInputMock).toHaveBeenCalledTimes(5);
    expect(getInputMock.mock.calls.map((c) => c[0])).toEqual([
      "token",
      "owner",
      "board",
      "repo",
      "number",
    ]);

    expect(getOctokitMock).toHaveBeenCalledTimes(1);
    expect(getOctokitMock).toHaveBeenCalledWith("THE TOKEN");

    expect(octokit.graphql).toHaveBeenCalledWith({
      board: "the-board",
      owner: "the-owner",
      query: `
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
    `,
      repo: "the-repo",
    });

    expect(setOutputMock).toHaveBeenCalledTimes(7);
    expect(setOutputMock.mock.calls.map((c) => c.join(": "))).toMatchSnapshot(
      "Output"
    );

    expect(infoMock).toHaveBeenCalledTimes(1);
    expect(infoMock).toHaveBeenCalledWith(
      "Issue: 666 is not on Board: the-board"
    );

    expect(setFailedMock).not.toHaveBeenCalled();
  });
});
