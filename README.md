VERSECRAFT CREATOR APP
AUTHORING GUIDE (PLAIN TEXT)

--------------------------------
WHAT THIS IS
--------------------------------

This is the official authoring guide for the VerseCraft Creator App.

The Creator App is used to build interactive, choice-based stories that import directly into the VerseCraft platform.

This guide exists so:
- creators don’t break their stories
- the engine doesn’t break on import
- stories remain compatible long-term

If you follow this guide exactly, your story will load.

--------------------------------
CORE CONCEPT
--------------------------------

VerseCraft stories are written as strict JSON.

They are NOT freeform.
They are NOT forgiving.
They are designed to be stable.

Everything is intentional.

--------------------------------
STORY ID (CRITICAL)
--------------------------------

Every story has a Story ID.
This is the contract between your story and VerseCraft.

Rules:
- lowercase only
- underscores only
- no spaces
- no hyphens

GOOD:
world_of_lorecraft
code_blue
timecop

BAD:
WorldOfLorecraft
world-of-lorecraft
world of lorecraft

Your filename MUST match the Story ID exactly.

Example:
world_of_lorecraft.json

--------------------------------
TOP-LEVEL STRUCTURE
--------------------------------

Every story JSON must have:

meta
start
scenes

Nothing else is required.
Nothing else should be added unless documented.

--------------------------------
META BLOCK
--------------------------------

The meta block defines how the story is identified and displayed.

Required fields:

id
title
route
schema
blurb

Example:

{
  "meta": {
    "id": "world_of_lorecraft",
    "title": "World of Lorecraft",
    "route": "story_world_of_lorecraft",
    "schema": "versecraft_story_schema_v1",
    "blurb": "A short description shown before the story begins."
  }
}

Rules:
- route MUST be "story_" + id
- blurb MUST exist
- blurb must be plain text
- no trailing commas

If the blurb is missing or invalid, the story will not render.

--------------------------------
START FIELD
--------------------------------

The start field tells VerseCraft which scene loads first.

Example:

"start": "S01"

Rules:
- must reference an existing scene
- case-sensitive
- required

--------------------------------
SCENES
--------------------------------

All story content lives inside the scenes object.

Scenes are keyed by Scene ID.

Scene ID rules:
- format: S01, S02, S03
- uppercase S
- two digits minimum
- unique
- case-sensitive

--------------------------------
SCENE STRUCTURE
--------------------------------

Each scene has:

text
options

Example:

"S01": {
  "text": "You stand at the edge of a forgotten archive.",
  "options": [
    { "label": "Enter", "to": "S02" },
    { "label": "Leave", "to": "S03" }
  ]
}

--------------------------------
TEXT FIELD
--------------------------------

The text field is the narrative content.

Rules:
- plain text only
- use \\n\\n for paragraph breaks
- no HTML
- no markdown
- no embedded formatting

--------------------------------
OPTIONS
--------------------------------

Options define player choices.

Each option has:
- label (short)
- to (scene ID)

Rules:
- labels should be concise
- "to" must reference an existing scene
- dead links will break the story

--------------------------------
JSON RULES (NON-NEGOTIABLE)
--------------------------------

VerseCraft uses strict JSON parsing.

This means:
- NO comments
- NO trailing commas
- NO smart quotes
- NO extra characters

One extra comma will break the entire file.

--------------------------------
VALIDATION (DO THIS EVERY TIME)
--------------------------------

Before importing, validate your JSON.

Quick browser test:

JSON.parse(yourJsonTextHere)

If it throws an error, the file is invalid.
Fix it before importing.

Recommended online validators:
- jsonlint.com
- jsonformatter.org
- jsoneditoronline.org

--------------------------------
DO NOT DO THESE THINGS
--------------------------------

- Do not change the schema name
- Do not invent new top-level keys
- Do not use spaces or hyphens in IDs
- Do not reference scenes that don’t exist
- Do not add comments to JSON
- Do not assume save data exists
- Do not modify VerseCraft engine files

--------------------------------
BEST PRACTICES
--------------------------------

- Write with expansion in mind
- Keep scene IDs consistent
- Test every branch
- Keep choices meaningful
- Backup working builds
- Validate before import
- Treat JSON like code

--------------------------------
DESIGN PHILOSOPHY
--------------------------------

VerseCraft favors:
- structure over chaos
- clarity over cleverness
- authored intent over randomness

The Creator App is strict to protect your work.

--------------------------------
WHAT’S COMING NEXT
--------------------------------

Planned support includes:
- flags and conditions
- RPG stats
- inventory hooks
- save-state logic
- multi-creator packs

Stories written now will remain compatible.

--------------------------------
END OF DOCUMENT
--------------------------------
