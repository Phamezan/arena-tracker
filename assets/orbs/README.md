# Player orb assets

Drop custom orb images here (any filename, e.g. `flame.png`). Reference the
filename in a player's `data/<player>.json` via the `"avatar"` field:

```json
{
  "summoner": "Phamezan#DKK",
  "avatar": "flame.png",
  ...
}
```

Players without an `avatar` field fall back to the default plain dot — this
field is entirely optional and manually set, there's no dashboard UI to
choose one.
