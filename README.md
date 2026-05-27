# Private CDN

## Recommended Method (Using GitHub Permalink)

Instead of manually converting links, you can directly create stable CDN links using GitHub’s **Permalink** feature.

This is useful because:

* Links never break after future commits
* Automatically uses the exact commit hash
* No need to manually copy hashes

---

# GitHub RAW Links

## Method 1 — Using Permalink (Recommended)

### Step 1

Open the file on GitHub.

---

### Step 2

Click:

```
⋯  →  Copy permalink
```

GitHub will copy a link like this:

```
https://github.com/USERNAME/REPO/blob/79942eae3161af4cb0fedc1d76d02a88842750c0/path/file.ext
```

Notice that instead of `main`, it now contains a commit hash.

---

### Step 3

Convert it into a RAW link:

Replace:

```
github.com
```

with:

```
raw.githubusercontent.com
```

and remove:

```
/blob
```

---

## Final RAW Link

```
https://raw.githubusercontent.com/USERNAME/REPO/79942eae3161af4cb0fedc1d76d02a88842750c0/path/file.ext
```

---

# jsDelivr CDN Links

You can also turn the permalink directly into a jsDelivr CDN link.

---

## jsDelivr Format

```
https://cdn.jsdelivr.net/gh/USERNAME/REPO@COMMIT_HASH/path/file.ext
```

---

## Example

### GitHub Permalink

```
https://github.com/IntenseParijat/cdn/blob/79942eae3161af4cb0fedc1d76d02a88842750c0/music/song.mp3
```

---

### jsDelivr CDN Link

```
https://cdn.jsdelivr.net/gh/IntenseParijat/cdn@79942eae3161af4cb0fedc1d76d02a88842750c0/music/song.mp3
```

* Special characters are automatically URL encoded.
