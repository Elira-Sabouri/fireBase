# Pictures for the practical write-ups

Drop screenshots and figures here, then point at them from `body` in
`assets/js/tutorials.js`:

```js
{ type: "image",
  src: "assets/img/tutorials/A00-vscode.png",
  alt: "VS Code with an R notebook open",
  caption: "What a working set-up looks like." }
```

- `src` is written from the site root, the same as every other path on the site.
- `alt` is not optional — it is what a screen reader announces, and what shows
  if the picture fails to load. Describe what the picture *shows*, not that it
  is a screenshot.
- Until the file is here the page says "Picture not added yet" with the path it
  expected, rather than showing a broken-image icon.
- Name them `<TOPIC>-<what-it-is>.png` so it stays obvious which session a
  picture belongs to.
- Keep them reasonably small (under ~300 KB); they are served straight from the
  repository with no resizing.
