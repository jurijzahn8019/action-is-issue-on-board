# action-is-issue-on-board

Checks whether an issue or pull is already added to the project board

This action will make a graphql query and determine whether an issue or pull request
Is already added to the project board identified by the name of the board

The Action is used in my org in some Project board automation workflows

## Inputs

### `token`

**Required** Github PAT with organization scope, e.g. secrets.GH_TOKEN

### `owner`

**Required** The organization owns the board or repository

### `board`

**Required** Project board name which should be searched for the Card with the issue

### `number`

**Required** Issue or pull request number to look for

### `repo`

**Required** the repo name (reponame in the owner scope without owner path)
where the issue is located

## Outputs

### `isOnBoard`

"true if issue is added to the given board"

### `boardId`

node_id or graphql id of the board

### `boardName`

name of teh project board

### `repo`

name of the repo where the issue is located

### `cardId`

graphql id of the card

### `columnName`

name of the column where the card with the issue is located

### `columnId`

graphql id of the column where the card with the issue is located

## Example usage

```yaml
name: User was Assigned to Issue
on:
  issues: [opened, reopened]

jobs:
  do-something:
    steps:
      - uses: jurijzahn8019/action-is-issue-on-board@v0.0.1
        id: checker
        with:
          token: ${{ secrets.GH_TOKEN }}
          owner: ${{ github.repository_owner }}
          board: My Board
          repo: ${{ github.event.repository.name }}
          number: ${{ github.event.issue.number }}

      - name: Do Something if issue is already on the board
        if: ${{ steps.checker.outputs.isOnBoard }}
        run: |
          do something with the issue
```

## Test run

```bash
DEBUG=action-is-issue-on-board* \
  INPUT_TOKEN=$GITHUB_TOKEN \
  INPUT_OWNER="my-org" \
  INPUT_BOARD="My Board" \
  INPUT_REPO="my-repo"
  INPUT_NUMBER=666 \
  ts-node src/index.ts
```
