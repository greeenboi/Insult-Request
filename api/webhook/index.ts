import dotenv from 'dotenv';
import {App, createNodeMiddleware} from "octokit";

const express = require('express');
const app = express();
dotenv.config();
app.use(express.json());

const appId = process.env.APP_ID || 0;
const webhookSecret = process.env.WEBHOOK_SECRET || '';
const privateKeyValue = process.env.PRIVATE_KEY_VALUE || '';

const octokitApp = new App({
    appId: appId,
    privateKey: privateKeyValue,
    webhooks: {
      secret: webhookSecret
    },
  });

const fetchinsult = async () => {
    const url = `https://evilinsult.com/generate_insult.php?lang=en&type=json`;
     return fetch(url)
     .then(response => response.json())
     .then((data) => data.insult);
};

const getInsulted = await fetchinsult();


async function handlePullRequestOpened({octokit, payload}) {
    console.log(`Received a pull request event for #${payload.pull_request.number}`);
  
    try {
      await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: payload.pull_request.number,
        body: getInsulted,
        headers: {
          "x-github-api-version": "2022-11-28",
        },
      });
    } catch (error) {
      if (error.response) {
        console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
      }
      console.error(error)
    }
};

async function handleIssueOpened({octokit, payload}){
    console.log(`Recieved a New Issue for ${payload.issue.number}`);
  
    try {
      await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: payload.issue.number,
        body: getInsulted,
        headers: {
        "x-github-api-version": "2022-11-28",
        },
      });
    } catch (error) {
      console.error(error);
    }
  }
  

octokitApp.webhooks.on("pull_request.opened", handlePullRequestOpened);
octokitApp.webhooks.on("issues.opened", handleIssueOpened);

// This logs any errors that occur.
octokitApp.webhooks.onError((error) => {
  if (error.name === "AggregateError") {
    console.error(`Error processing request: ${error.event}`);
  } else {
    console.error(error);
  }
});

const port = 3000;
const host = 'localhost';
const path :string = "/api/webhook";
const localWebhookUrl = `http://${host}:${port}${path}`;

const middleware = createNodeMiddleware(octokitApp, { pathPrefix: path });
app.use(middleware);

app.listen(port, () => {
  console.log(`Server is listening on http://${host}:${port}`);
  console.log(`Webhook URL: ${localWebhookUrl}`);
})

app.post(path, (req, res) => {

    console.log('Received a webhook event');
    res.status(200).send('Event received');
  
    // octokitApp.webhooks.verify(req).catch(console.error);
})

app.get('/', (req, res) => {
    res.send('Hello World')
})