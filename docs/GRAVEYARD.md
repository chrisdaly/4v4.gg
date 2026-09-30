# Graveyard

Anything deleted from the news system, with the commit that removed it, so it
can be read back or restored without archaeology.

Nothing is ever deleted because it is "old". It is deleted because something
else now does the job, and that replacement is named here.

## How to restore

The code is never gone, only the working tree moves on. To read a removed
file at the commit before its removal:

```bash
git show <sha>^:path/to/File.jsx            # print it
git checkout <sha>^ -- path/to/File.jsx     # bring it back
```

To see everything a removal commit touched:

```bash
git show --stat <sha>
```

## Compatibility rule

**Every digest already in the database must keep rendering.** There are
weekly issues going back to March 2026 and daily digests before July 2026,
written by a generator that no longer runs. Their format is the contract:
sections are line-based `KEY: value`, sub-stories are split on `;`, and a
missing section renders nothing rather than breaking the page.

New sections are additive. Parsers treat an absent key as absent, never as an
error. Nothing that reads a digest may require a key that old issues lack.

Covered by `src/test/digestCompat.test.js`, which parses a real March 2026
weekly and a pre-July daily and asserts that sub-stories without headlines,
absent WEEK_TREND / MOST_TALKED_ABOUT, stat lines with and without a form
string, and a daily with no BEST_OF_CHAT all still work.

## Removed

### The issue page's editorial drawer - 2026-09-30
- **Commit:** `3998dce`
- **Was:** DRAMA / HIGHLIGHTS item pickers with drag and delete, section and
  stat visibility toggles, Regenerate, Headlines, Generate Variants, and the
  confirm and picker modals behind them. 154 lines plus its state.
- **Replaced by:** `/news-desk`, which finds candidates, writes the stories
  and computes every numeric section.
- **Kept on the page:** Edit Cover, Pick Cover, Preview, Publish, and inline
  text editing. The desk cannot read an existing issue back yet, so inline
  editing is still the only way to fix a typo. Remove it when that lands.
- **Restore:** `git checkout 3998dce^ -- src/components/news/WeeklyMagazine.jsx`

<!-- Format:
### <what> - <YYYY-MM-DD>
- **Commit:** `<sha>`
- **Was:** one line on what it did
- **Replaced by:** what does the job now, or "nothing, it was dead"
- **Restore:** `git checkout <sha>^ -- <paths>`
-->
