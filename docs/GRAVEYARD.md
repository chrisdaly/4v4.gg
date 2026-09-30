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

Covered by `src/test/newsIssue.test.jsx` and `src/test/digest-parser.test.js`.

## Removed

_Nothing yet._

<!-- Format:
### <what> - <YYYY-MM-DD>
- **Commit:** `<sha>`
- **Was:** one line on what it did
- **Replaced by:** what does the job now, or "nothing, it was dead"
- **Restore:** `git checkout <sha>^ -- <paths>`
-->
