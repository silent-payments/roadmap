// #file:fetch-activity.js
const { Octokit } = require('@octokit/rest');
const { getRepoActivity, getLatestActivity } = require('../.github/scripts/fetch-activity');

async function testGetRepoActivity() {
  const github = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = 'silent-payments';
  const repo = 'BIP0352-index-server-specification';

  const activityDate = await getRepoActivity(github, owner, repo);
  if (activityDate) {
    console.log(`Latest activity for ${owner}/${repo}: ${activityDate.toISOString()}`);
  } else {
    console.log(`No activity found for ${owner}/${repo}`);
  }
}

async function testGetLatestActivity() {
    const github = new Octokit({ auth: process.env.GITHUB_TOKEN });
    issue = {
        "number": 1,
        "title": "BIP352 spec",
        "repoUrl": "https://github.com/silent-payments/BIP0352-index-server-specification/"
    }
    console.log(`Processing issue #${issue.number}: ${issue.title}`);
    console.log(`Repository URL: ${issue.repoUrl}`);
      
      // Fetch latest activity
      const lastActivity = await getLatestActivity(github, issue.repoUrl);
      
      if (!lastActivity) {
        console.log(`No activity found for issue #${issue.number}`);
      } else {
        console.log(`Latest activity: ${lastActivity.toISOString()}`);
      }
      
      
      
}

testGetRepoActivity();
testGetLatestActivity();
