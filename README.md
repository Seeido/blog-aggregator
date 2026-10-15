# gator

A command-line RSS feed aggregator. Add feeds, follow the ones you care about, let gator collect new posts in the background, and browse them from your terminal.

> Guided learning project from [Boot.dev](https://www.boot.dev)'s Build a Blog Aggregator course, built to practice PostgreSQL, SQL migrations, Drizzle ORM, and async TypeScript. Not a product.  
> See [Design Notes](#design-notes) for what I learned and where I went beyond the course.

## Requirements

- [Node.js](https://nodejs.org) (a recent LTS version) and npm
- [PostgreSQL](https://www.postgresql.org), installed and running locally

## Setup

1. **Clone the repo and install dependencies**

   ```sh
   git clone https://github.com/Seeido/gator.git
   cd gator
   npm install
   ```

2. **Create a database**

   ```sh
   psql postgres -c "CREATE DATABASE gator;"
   ```

   (On Linux you may need `sudo -u postgres psql -c "CREATE DATABASE gator;"`.)

3. **Create the config file** at `~/.gatorconfig.json`, pointing at your database:

   ```json
   {
     "db_url": "postgres://<username>:<password>@localhost:5432/gator?sslmode=disable"
   }
   ```

   gator also stores the currently logged-in user in this file, as `current_user_name`. You don't need to add that yourself.

4. **Create the tables**

   ```sh
   npm run migrate
   ```

## Usage

Run commands with:

```sh
npm run start <command> [args...]
```

### Users

| Command | Description |
|---|---|
| `register <name>` | Create a user and log in as them |
| `login <name>` | Switch to an existing user |
| `users` | List all users, marking the current one |

### Feeds

| Command | Description |
|---|---|
| `addfeed <name> <url>` | Add a feed as the current user and follow it |
| `feeds` | List all feeds and who added them |
| `follow <url>` | Follow an existing feed |
| `following` | List the feeds you follow |
| `unfollow <url>` | Stop following a feed |

### Collecting and reading posts

| Command | Description |
|---|---|
| `agg <interval>` | Fetch feeds continuously, e.g. `agg 1m`. Accepts `ms`, `s`, `m`, `h`. Stop with Ctrl+C |
| `browse [limit]` | Show the newest posts from feeds you follow (default 2) |

### Other

| Command | Description |
|---|---|
| `reset` | Delete **all** users, feeds, and posts |

## Example

```sh
npm run start register alice
npm run start addfeed "Hacker News" https://news.ycombinator.com/rss

# in a separate terminal, leave this running
npm run start agg 1m

# back in the first terminal
npm run start browse 5
```

Feed names with spaces need quotes. Please keep the `agg` interval reasonable so you don't overload the sites you fetch from.

## Design Notes

### Beyond the course

- **Batch post inserts.** The course saves posts one at a time. gator inserts a feed's posts in a single query with `ON CONFLICT DO NOTHING`, so already-saved posts are skipped and the returned rows are exactly the new ones. One round trip per feed instead of one per post.
- **Feeds are marked before fetching.** If a feed's URL is broken, it still gets marked as fetched, so it can't stay "oldest" forever and block every other feed from being scraped.
- **Underlying errors are surfaced.** Drizzle wraps database errors in a generic "Failed query" error. gator prints the original Postgres error (`error.cause`) as well, so failures say why they happened.

### What I learned

- How an app talks to Postgres: driver, ORM, and the connection string, and why Postgres runs as a separate server.
- Migrations as versioned schema history, and reading generated SQL before applying it (a `text` vs `uuid` foreign key mismatch taught me that one).
- Foreign keys, `ON DELETE CASCADE`, and why `TRUNCATE` refuses unless every table referencing it is truncated in the same statement.
- Joins instead of queries in a loop (the N+1 problem), and `NULLS FIRST` / `NULLS LAST` ordering.
- Async/await through a whole call chain, middleware as a higher-order function, and graceful shutdown with `SIGINT`.
