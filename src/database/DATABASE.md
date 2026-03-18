# Database Schema

This is the documentation for all of the tables utilized by this project.

## Project Tables

These tables are related to tracking projects.

### Projects

This table holds all projects currently in SDC. **Many2One** allows for multiple projects per team.

| Column      | Type      | Purpose                                                                                                     |
| :---------- | :-------- | :---------------------------------------------------------------------------------------------------------- |
| `slug`      | `TEXT`    | A readable "tag" that refers to a project. Term, team and simple project name. ex. `sp2026-team13-cachebot` |
| `name`      | `TEXT`    | The "display" name of a project. ex. `Cache Bot`                                                            |
| `team_id`   | `TEXT`    | The team UUIDv4 that controlls this project. See [Teams](#teams)                                            |
| `is_active` | `BOOLEAN` | If this project is active.                                                                                  |

### Members

This table holds information about project members and their related accounts. **One2One** as we want to ensure 1 user entry per member.

| Column        | Type   | Purpose                                                                                             |
| :------------ | :----- | :-------------------------------------------------------------------------------------------------- |
| `discord_id`  | `TEXT` | The [Discord](https://discord.com) account ID associated w/ a member. ex. `XXXXXXXXXXXXXXXXXX`      |
| `github_user` | `TEXT` | The [GitHub](https://github.com) username associated w/ a member. ex/ `gavinhsmith`, `cash06`, etc. |

### Teams

This table holds data related to teams. **One2One**.

| Column       | Type      | Purpose                                                                           |
| :----------- | :-------- | :-------------------------------------------------------------------------------- |
| `id`         | `TEXT`    | The UUIDv4 that refers to a specific team.                                        |
| `num_id`     | `INTEGER` | The display number that a team held during their active time. ex. `13`            |
| `role_id`    | `TEXT`    | The [Discord](https://discord.com) role ID that is associated w/ a team.          |
| `channel_id` | `TEXT`    | The [Discord](https://discord.com) text channel ID that a team is connected with. |
| `is_active`  | `BOOLEAN` | If a team is currently active. ex. `1` or `0`                                     |

### TeamAssociations

This table holds associative data between users and teams. **Many2Many** structure allows for users to be on multiple teams.

| Column    | Type   | Purpose                                                                                |
| :-------- | :----- | :------------------------------------------------------------------------------------- |
| `id`      | `TEXT` | The UUIDv4 that refers to an association. Not needed directly, just for best practice. |
| `user_id` | `TEXT` | The member UUIDv4 for an association. See [Members](#members).                         |
| `team_id` | `TEXT` | The team UUIDv4 for an association. See [Teams](#teams).                               |

## AI Tables (WIP)

This collection of tables is related to managing the AI agent. I have not worked with a lot of AI API tools, so these are just what I had researched online and saw were common tables to have. Will be adjusted.

### MessageHistory

This table holds information related to team channel history. **Many2Many**.

| Column        | Type   | Purpose                                                                                     |
| :------------ | :----- | :------------------------------------------------------------------------------------------ |
| `id`          | `TEXT` | A UUIDv4 that is associated with this message. Not needed directly, just for best practice. |
| `team_id`     | `TEXT` | The team UUIDv4 that a message is associated with. See [Teams](#teams).                     |
| `user_id`     | `TEXT` | The member UUIDv4 that a message is associated with. See [Members](#members).               |
| `msg_content` | `TEXT` | The content of a message. ex. `Hello!`                                                      |

### SessionHistory

This table holds information about specific chat sessions. **One2One**

| Column       | Type   | Purpose                                             |
| :----------- | :----- | :-------------------------------------------------- |
| `session_id` | `TEXT` | A UUIDv4 that references the session.               |
| `channel_id` | `TEXT` | A UUIDv4 that groups multiple attachments together. |
| `user_id`    | `TEXT` | The name of the file. ex. `file.ts`                 |
| `timestamp`  | `TEXT` | The content of the file.                            |
