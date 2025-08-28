/**
 * Fetch latest activity from external repositories
 */

// Parse repository URL from issue body (keeps URL visible to users)
function extractRepositoryUrl(issueBody) {
  // Look for Repository: **text** format (cleaned format)
  const repoMatch = issueBody.match(/\*\*Repository:\*\*\s*(.+)/);
  if (repoMatch) {
    return repoMatch[1].trim();
  }
  
  // Fallback: look for ### Repository Link format (original form)
  const formMatch = issueBody.match(/### Repository Link\s*\n([^\n]*)/);
  if (formMatch) {
    return formMatch[1].trim();
  }
  
  return null;
}

// Get latest meaningful activity from external repository
async function getLatestActivity(github, repoUrl) {
  if (!repoUrl || !repoUrl.includes('github.com')) {
    return null;
  }
  
  try {
    // Parse different GitHub URL formats
    let match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)\/?$/);
    if (match) {
      // PR URL
      const [, owner, repo, number] = match;
      return await getPRActivity(github, owner, repo, parseInt(number));
    }
    
    match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)\/?$/);
    if (match) {
      // Issue URL  
      const [, owner, repo, number] = match;
      return await getIssueActivity(github, owner, repo, parseInt(number));
    }
    
    match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?\/?$/);
    if (match) {
      // Repository URL (with optional branch)
      const [, owner, repo, branch] = match;
      return await getRepoActivity(github, owner, repo, branch || 'main');
    }
    
    return null;
  } catch (error) {
    console.log(`Error fetching activity for ${repoUrl}:`, error.message);
    return null;
  }
}

// Get PR activity (commits, reviews, comments)
async function getPRActivity(github, owner, repo, prNumber) {
  try {
    // Get PR details
    const pr = await github.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });
    
    // Get timeline events for more detailed activity
    const events = await github.rest.issues.listEventsForTimeline({
      owner,
      repo,
      issue_number: prNumber
    });
    
    // Find latest meaningful activity
    const meaningfulEvents = events.data.filter(event => 
      ['committed', 'reviewed', 'commented', 'pushed'].includes(event.event)
    );
    
    // Get latest activity date
    const dates = [
      pr.data.updated_at,
      ...meaningfulEvents.map(e => e.created_at)
    ].filter(Boolean);
    
    return dates.length > 0 ? new Date(Math.max(...dates.map(d => new Date(d)))) : null;
    
  } catch (error) {
    if (error.status === 404) {
      console.log(`PR not found: ${owner}/${repo}#${prNumber}`);
    }
    return null;
  }
}

// Get issue activity
async function getIssueActivity(github, owner, repo, issueNumber) {
  try {
    const issue = await github.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber
    });
    
    return new Date(issue.data.updated_at);
  } catch (error) {
    if (error.status === 404) {
      console.log(`Issue not found: ${owner}/${repo}#${issueNumber}`);
    }
    return null;
  }
}

// Get repository activity (latest commits)
async function getRepoActivity(github, owner, repo, branch = 'main') {
  const branchesToTry = branch === 'main' ? ['main', 'master'] : [branch, branch === 'master' ? 'main' : 'master'];
  for (const b of branchesToTry) {
    try {
      const commits = await github.rest.repos.listCommits({
        owner,
        repo,
        sha: b,
        per_page: 1
      });
      if (commits.data.length > 0) {
        return new Date(commits.data[0].commit.committer.date);
      }
    } catch (error) {
      if (error.status === 404) {
        // Try next branch
        continue;
      } else {
        throw error;
      }
    }
  }
  console.log(`Repository not found or branches not found: ${owner}/${repo}@${branchesToTry.join(',')}`);
  return null;
}

// Main function to get all issues with repository links
async function getAllIssuesWithRepoLinks(github, owner, repo) {
  const allIssues = [];
  let page = 1;
  
  while (true) {
    const issues = await github.rest.issues.listForRepo({
      owner,
      repo,
      state: 'all',
      per_page: 100,
      page: page
    });
    
    if (issues.data.length === 0) break;
    
    // Filter issues that have repository links
    const issuesWithLinks = issues.data.filter(issue => {
      const repoUrl = extractRepositoryUrl(issue.body || '');
      return repoUrl && repoUrl.includes('github.com');
    }).map(issue => ({
      number: issue.number,
      title: issue.title,
      body: issue.body,
      repoUrl: extractRepositoryUrl(issue.body || '')
    }));
    
    allIssues.push(...issuesWithLinks);
    page++;
  }
  
  return allIssues;
}

module.exports = {
  extractRepositoryUrl,
  getLatestActivity,
  getAllIssuesWithRepoLinks,
  getRepoActivity
};