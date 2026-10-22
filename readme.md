# API Endpoints for Publishing and Searching

Publish a read-only API for an existing MongoDB collection using [Express](https://expressjs.com/), the native [MongoDB Node.js driver](https://www.mongodb.com/docs/drivers/node/current/), and [Netlify Functions](https://docs.netlify.com/build/frameworks/framework-setup-guides/express/).

You need an existing database and collection. Use an Atlas sample dataset or [import your own data through MongoDB Compass](https://www.mongodb.com/docs/compass/import-export/). The app does not seed data, create collections or indexes, or expose write endpoints.

## Project structure

```text
backend/
  functions/api.js       All endpoints, the Netlify handler, and local startup
  database/connect.js    Shared MongoClient connection pool
frontend/
  index.html             Demo page
  script.js              Fetch and display data
  style.css              Page styles
netlify.toml             Static hosting, functions, and URL routing
```

## Local development and Netlify hosting

The same Express app and API endpoints in `backend/functions/api.js` run in both environments. The conditional at the bottom of that file selects how the app starts:

| Responsibility | Local development | Deployed on Netlify |
| --- | --- | --- |
| Startup | With `NETLIFY` unset, connect to MongoDB and call `app.listen()` | Netlify sets `NETLIFY`, so local startup is skipped; requests use the exported `handler` through `serverless-http` |
| Frontend files | Express serves `frontend/` | Netlify serves `frontend/` as static files |
| API routing | Express handles `/api/...` directly | `netlify.toml` rewrites `/api/...` to the function, which runs the same Express routes |
| Database configuration | `MONGODB_URI` is loaded from `.env` | `MONGODB_URI` is configured in Netlify's environment variable settings |
| Connection reuse | The running Express process reuses its MongoDB connection | A function instance reuses its connection while it stays warm |

**Students do not need the Netlify CLI or a Netlify account to run the app locally.** After installing Node.js and configuring MongoDB, use `npm install` and `npm start`. Local development uses an ordinary Express server; it does not require a serverless emulator or read the routing rules in `netlify.toml`.

## 1. Install dependencies

Use Node.js 24 (also specified in the Netlify configuration), then run:

```sh
npm install
```

There is no model, schema introspection, or generated database client step. The native driver reads the fields and document structures already present in your collection.

## 2. Configure the database connection

Copy `.env.example` to a new file named `.env`. Replace the placeholder with your Atlas connection string:

```dotenv
MONGODB_URI=mongodb+srv://username:password@cluster.abc.mongodb.net/database_name
```

The path after `.net/` selects the **database**, not the collection. Replace `database_name` with the database containing your data. URL-encode special characters in the username and password. Keep `.env` out of Git; it is already ignored.

In Atlas, create a database user with read access to the dataset. Configure Network Access to allow your development machine and, when deploying, Netlify Functions. Check both credentials and network access when diagnosing connection failures.

## 3. Select your collection and search field

Open `backend/functions/api.js`. At the top of the file, set `collectionName` to the exact name of your existing collection:

```js
const collectionName = 'movies'
```

The default collection belongs to Atlas's `sample_mflix` database. To use it, select `sample_mflix` in your connection string.

For Atlas's sample restaurants dataset:

- Use `sample_restaurants` as the database in `MONGODB_URI`.
- Set `collectionName` to `restaurants`.

The `/api/search` endpoint searches the collection's `title` field using a case-insensitive literal substring match. The search field is currently fixed in `backend/functions/api.js`; changing to a different field requires changing `title` in the search query as well.

The `/api/items` endpoint returns all fields in each selected document, including nested objects, arrays, and documents with different structures. It does not cast field values according to a model. To use `/api/search`, the selected collection must contain a string-valued `title` field in the documents you want to find.

All document fields are published, so select a collection whose contents you intend to expose.

Use Compass's Schema tab to inspect your collection. No schema needs to be copied into the app. The frontend displays full documents as formatted JSON, so it works with different field names and structures.

If you later need rules for inserted or updated documents, you can add optional [MongoDB collection validation](https://www.mongodb.com/docs/atlas/atlas-ui/validation/) in Atlas. The read-only API does not create or modify those rules.

## 4. Run locally

```sh
npm start
```

Open [http://localhost:3000](http://localhost:3000). The page fetches `/api/items` and displays complete documents as formatted JSON. The full response is also logged to the browser console. Use `npm run dev` to restart automatically when backend files change.

Local startup is handled at the bottom of `backend/functions/api.js` by `if (!process.env.NETLIFY)`, matching the TODO example. Leave `NETLIFY` unset locally. The server connects to MongoDB before starting, so a missing or invalid connection string produces a startup error.

## 5. Explore the API

All data endpoints return a JSON array with at most 10 documents.

| URL | Behavior |
| --- | --- |
| `/api/items` | Read documents directly from the collection, with no specified ordering |
| `/api/search?terms=titanic` | Search the `title` field for a case-insensitive literal substring | 

Search terms are literal: a period matches a period, rather than any character. Omitting `terms`, or passing an empty string, matches documents whose `title` field contains text, up to the limit. Documents with missing or non-string `title` values are not converted into searchable strings. Repeating the parameter, such as `?terms=a&terms=b`, returns HTTP 400. Other query parameters do not change the collection, field, or result limit.

```sh
curl http://localhost:3000/api/items
curl "http://localhost:3000/api/search?terms=cafe"
```

### Document values and JSON output

Responses use MongoDB's `_id` field. ObjectIds become JSON strings; existing string and numeric IDs keep their types. There is no renamed `id` field. A numeric `name`, for example, remains a number in `/api/items`.

The HTTP response is JSON, so BSON-specific types still need JSON representations: dates become ISO strings, for example. This is a convenient API representation rather than a BSON backup or export. See the driver's [BSON documentation](https://www.mongodb.com/docs/drivers/node/current/data-formats/bson/) for details on database types.

## 6. Deploy to Netlify

Deployment uses Netlify's web dashboard and GitHub integration. You do not need to install the Netlify CLI on the lab computer.

1. Push the repository to GitHub and import it through the Netlify web dashboard, connecting the GitHub repository for deployment.
2. Let Netlify use `netlify.toml`: publish directory `frontend`, functions directory `backend/functions`. No custom build command is needed for this plain JavaScript project.
3. Add `MONGODB_URI` in the site's environment variable settings. Make it available to Functions and each deploy context you plan to test. Keep the URI out of `netlify.toml` and frontend code.
4. Configure Atlas Network Access for the deployed function and use a database user with read access to the collection.
5. Deploy, then check `/`,  `/api/items`, and `/api/search?terms=cafe`. Use the function logs to diagnose database failures. Redeploy after changing function environment variables.

Netlify serves the frontend as static files. Requests under `/api/` are rewritten to the Express function using `serverless-http`. When `NETLIFY` is set, importing the function does not start a listening server.

### Checking deployment behavior

Running Express locally checks the shared API logic and frontend, but does not emulate Netlify's redirects or serverless runtime. Verify those using a deployed preview before publishing changes to an existing site. The Netlify CLI can be used for optional maintainer checks; it is not a prerequisite for the student workflow.
