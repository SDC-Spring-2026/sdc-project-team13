import { createNewLogger } from "../tools/log";

const log = createNewLogger("github-app");

const dynamicImport = new Function("s", "return import(s)") as <T>(s: string) => Promise<T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let installationOctokit: any = null;

function getOrg(): string {
    const org = process.env.GITHUB_ORG;
    if (!org) throw new Error("GITHUB_ORG is not set in environment.");
    return org;
}

async function getAppOctokit() {
    if (installationOctokit) return installationOctokit;

    const appId = process.env.GITHUB_APP_ID;
    const rawKey = process.env.GITHUB_APP_PRIVATE_KEY;
    if (!appId || !rawKey) throw new Error("GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY is not set.");

    // .env stores newlines as literal \n — convert back to actual newlines for the PEM parser
    const privateKey = rawKey.replace(/\\n/g, "\n");
    const org = getOrg();

    const { App } = await dynamicImport<typeof import("octokit")>("octokit");
    const app = new App({ appId, privateKey });

    let installation;
    try {
        ({ data: installation } = await app.octokit.request(
            "GET /orgs/{org}/installation",
            { org }
        ));
    } catch {
        throw new Error(
            `GitHub App is not installed on org "${org}" (or GITHUB_ORG is wrong). ` +
            `Install the app at https://github.com/organizations/${org}/settings/installations`
        );
    }

    installationOctokit = await app.getInstallationOctokit(installation.id);
    log.info(`GitHub App installation Octokit ready (installation ${installation.id}, org: ${org})`);
    return installationOctokit;
}

/**
 * Creates a private repository under the configured org named after the team slug.
 * @param repoName The slug used as the repo's URL name.
 * @param displayName The project name shown as the repo's description in GitHub's UI.
 * Returns the new repo's HTML URL.
 */
export async function createTeamRepo(repoName: string, displayName: string): Promise<string> {
    const octokit = await getAppOctokit();
    const org = getOrg();

    const { data } = await octokit.request("POST /orgs/{org}/repos", {
        org,
        name: repoName,
        description: displayName,
        private: true,
        auto_init: true,
    });

    log.info(`Created repo ${org}/${repoName}: ${data.html_url}`);
    return data.html_url as string;
}

/**
 * Grants a GitHub user write (push) access to a team's repo.
 */
export async function addRepoCollaborator(repoName: string, githubUsername: string): Promise<void> {
    const octokit = await getAppOctokit();
    const org = getOrg();

    await octokit.request("PUT /repos/{owner}/{repo}/collaborators/{username}", {
        owner: org,
        repo: repoName,
        username: githubUsername,
        permission: "push",
    });

    log.info(`Added collaborator ${githubUsername} → ${org}/${repoName} (write)`);
}

/**
 * Revokes a GitHub user's access to a team's repo.
 */
export async function removeRepoCollaborator(repoName: string, githubUsername: string): Promise<void> {
    const octokit = await getAppOctokit();
    const org = getOrg();

    await octokit.request("DELETE /repos/{owner}/{repo}/collaborators/{username}", {
        owner: org,
        repo: repoName,
        username: githubUsername,
    });

    log.info(`Removed collaborator ${githubUsername} from ${org}/${repoName}`);
}
