"""PETSCII illustration craft: reference catalog, shading recipes, drawing critique."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import op_art
import rug_styles
import world_art

AGENT_ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = AGENT_ROOT / "examples"

C64_INK_NAMES = [
    "black",
    "white",
    "red",
    "cyan",
    "purple",
    "green",
    "blue",
    "yellow",
    "orange",
    "brown",
    "light red",
    "dark gray",
    "gray",
    "light green",
    "light blue",
    "light gray",
]

# Against a black (0) screen background, from brightest to darkest perceived step.
SHADING_LADDER = [
    {"glyph": 160, "role": "solid", "note": "Catchlights, lamps, brightest lit skin, rim lines."},
    {"glyph": 102, "role": "checker", "note": "Default mid tone; half the cell is ink."},
    {"glyph": 78, "role": "diagonal-light-from-left", "note": "Brushed metal, fur slanting with key light from the left."},
    {"glyph": 77, "role": "diagonal-light-from-right", "note": "Mirror of 78 when key light is from the right."},
    {"glyph": 226, "role": "top-half", "note": "Horizontal highlight band (brow, horizon glare)."},
    {"glyph": 98, "role": "bottom-half", "note": "Jaw shade, ground shadow band."},
    {"glyph": 95, "role": "triangle-up", "note": "Ramp into a neighbor above."},
    {"glyph": 105, "role": "triangle-down", "note": "Ramp into a neighbor below."},
    {"glyph": 126, "role": "upper-left-quarter", "note": "Edge transition; dashed fringe on outer silhouette."},
    {"glyph": 123, "role": "lower-right-quarter", "note": "Paired with 126 on complex contours."},
    {"glyph": 127, "role": "diagonal-split", "note": "One cell between a lit mass and a dark mass."},
]

OUTLINE_GLYPHS = {
    "left_edge": 225,
    "right_edge": 97,
    "note": "Keep silhouette edges on 160 or half-blocks; texture stays inside.",
}

# Not for fill shading — holes, slots, scan lines.
ACCENT_GLYPHS = [103, 116, 111]

DRAWING_PASSES = [
    {
        "pass": 1,
        "name": "silhouette",
        "action": "Block the mass with solid 160. One background ink (usually 0). Subject fills the frame.",
    },
    {
        "pass": 2,
        "name": "light",
        "action": "Split into lit ink, mid ink, and shadow ink. One-sided key light; far side drops step then black.",
    },
    {
        "pass": 3,
        "name": "focal",
        "action": "Eyes, mouth, one accent color. Portrait: eyes high, large, catchlight in white on dark pupil.",
    },
    {
        "pass": 4,
        "name": "texture",
        "action": "Replace interior solids: lit band checker 102, mid band diagonals 77/78, shadow stays dense 160 in dark ink.",
    },
    {
        "pass": 5,
        "name": "review",
        "action": "read_grid, render_still, critique_drawing. Fix issues; undo and rework a pass if needed.",
    },
]

REFERENCE_CATALOG: list[dict[str, Any]] = [
    {
        "id": "IMG_0343",
        "file": "IMG_0343.JPG",
        "category": "portrait",
        "subject": "Jungle soldiers, helicopter, palm — multi-panel master study",
        "study_for": ["portrait", "scene", "military", "multi-figure"],
        "craft": [
            "Four compositions on one sheet: study how each panel still reads at thumbnail scale.",
            "Cross-hatched cheeks and helmets: checker and line glyphs, not flat solids.",
            "Yellow sky band behind silhouettes — busy subject, simple horizon.",
            "Last Ninja eyes: slit mask, white pupil spark on black — minimal cells, maximum read.",
        ],
    },
    {
        "id": "IMG_0344",
        "file": "IMG_0344.JPG",
        "category": "figure",
        "subject": "Character / creature figure work",
        "study_for": ["figure", "creature", "action"],
        "craft": [
            "Silhouette first; horns and limbs extend to frame edges.",
            "Accent colors (tongue, eyes) are one ink each, not sprinkled.",
            "Hold a single diagonal direction per fur or scale region.",
        ],
    },
    {
        "id": "IMG_0346",
        "file": "IMG_0346.JPG",
        "category": "figure",
        "subject": "Tiger in profile — orange, white, grey, green eyes",
        "study_for": ["animal", "fur", "profile", "stripes"],
        "craft": [
            "One stripe direction per body zone; do not mix 77 and 78 in the same patch.",
            "Green eye accent inside white muzzle ring — focal color is tiny.",
            "Grey chest bridges white highlight to black belly with dense solids, not checkers.",
            "Background: two purple bands + jagged grass repetition, stays behind the cat.",
        ],
    },
    {
        "id": "IMG_0347",
        "file": "IMG_0347.JPG",
        "category": "place",
        "subject": "Landscape / exterior",
        "study_for": ["landscape", "horizon", "architecture"],
        "craft": [
            "Horizontal bands for sky and ground; texture only in one band.",
            "Architecture uses line glyphs for edges, blocks for mass.",
        ],
    },
    {
        "id": "IMG_0348",
        "file": "IMG_0348.PNG",
        "category": "place",
        "subject": "Exterior scene",
        "study_for": ["landscape", "depth"],
        "craft": [
            "Atmospheric perspective: simpler glyphs and fewer inks in the distance.",
        ],
    },
    {
        "id": "IMG_0349",
        "file": "IMG_0349.PNG",
        "category": "figure",
        "subject": "Figure composition",
        "study_for": ["figure", "pose"],
        "craft": [
            "Pose readable in solid 160 alone before texture pass.",
        ],
    },
    {
        "id": "IMG_0350",
        "file": "IMG_0350.JPG",
        "category": "portrait",
        "subject": "Portrait lighting",
        "study_for": ["portrait", "face", "lighting"],
        "craft": [
            "Crop at forehead and chest; face centered but eyes in upper third.",
            "Lit side: light green / light blue / white steps; shadow side falls to brown then black.",
        ],
    },
    {
        "id": "IMG_0351",
        "file": "IMG_0351.JPG",
        "category": "place",
        "subject": "Architecture / street",
        "study_for": ["building", "street", "night"],
        "craft": [
            "Window fields as one repeating glyph in one or two inks.",
            "Signs and labels are few characters, not paragraphs.",
        ],
    },
    {
        "id": "IMG_0352",
        "file": "IMG_0352.PNG",
        "category": "panels",
        "subject": "Screen of panels and labels",
        "study_for": ["ui", "panels", "demo", "labels"],
        "craft": [
            "Boxes drawn with corner + line glyphs; interior left calm.",
            "Typography is part of the layout grid, not overlaid after art.",
        ],
    },
    {
        "id": "IMG_0353",
        "file": "IMG_0353.PNG",
        "category": "figure",
        "subject": "Figure with strong silhouette",
        "study_for": ["figure", "silhouette"],
        "craft": [
            "Black is paint: hair and shadow masses are ink 0 cells, not empty holes.",
        ],
    },
    {
        "id": "IMG_0354",
        "file": "IMG_0354.PNG",
        "category": "portrait",
        "subject": "Elder with pipe — brown, purple, green portrait",
        "study_for": ["portrait", "face", "wrinkles", "smoke"],
        "craft": [
            "Wrinkles are thin vertical/horizontal line glyphs on cheeks and brow.",
            "Pipe smoke uses soft checkers and rounded symbols, not solids.",
            "Three skin inks plus black; purple shadow side, green mid, brown structure.",
            "Tiny narrative glyph on lapel — one symbol, not a sticker cluster.",
        ],
    },
    {
        "id": "IMG_0355",
        "file": "IMG_0355.PNG",
        "category": "portrait",
        "subject": "Close face, dramatic upward light, fangs",
        "study_for": ["portrait", "face", "expression", "hair"],
        "craft": [
            "Hair is vertical bars and blocks, not random letters.",
            "Green mid-tone on skin between white highlight and brown shadow.",
            "Mouth and teeth: few cells, high contrast; do not over-detail every tooth.",
        ],
    },
    {
        "id": "IMG_0356",
        "file": "IMG_0356.PNG",
        "category": "portrait",
        "subject": "Portrait study",
        "study_for": ["portrait", "face"],
        "craft": [
            "Match eye spacing to reference: one cell catchlight per eye.",
        ],
    },
    {
        "id": "IMG_0357",
        "file": "IMG_0357.JPG",
        "category": "portrait",
        "subject": "Noir city portrait — glasses, cigarette, skyline",
        "study_for": ["portrait", "city", "glasses", "cyberpunk"],
        "craft": [
            "Portrait dominates center; skyline is low-contrast texture behind.",
            "Glass lens: checker disc; one lens may carry a red UI accent only.",
            "Buildings use repeated window glyph fields; labels are 4–8 chars max.",
            "Cigarette ember: single red cell on dark stick.",
        ],
    },
    {
        "id": "IMG_0358",
        "file": "IMG_0358.GIF",
        "category": "portrait",
        "subject": "Animated portrait (study motion on face)",
        "study_for": ["portrait", "animation"],
        "craft": [
            "When animating, keep texture glyphs stable; move color or backdrop, not glyph chaos.",
        ],
    },
    {
        "id": "IMG_0359",
        "file": "IMG_0359.JPG",
        "category": "place",
        "subject": "Victorian house — grayscale, chiaroscuro",
        "study_for": ["architecture", "house", "horror", "stairs"],
        "craft": [
            "Four inks only: black, dark gray, light gray, white — proves glyph shading without hue.",
            "Lit wall: vertical stripes + checker; shadow half nearly pure black.",
            "Lit windows: white blocks as focal points; one silhouette figure inside.",
            "Foliage: one triangle/diagonal glyph repeated; stays behind structure.",
        ],
    },
    {
        "id": "IMG_0360",
        "file": "IMG_0360.PNG",
        "category": "figure",
        "subject": "Winged chimera — sphinx pose, triple heads",
        "study_for": ["creature", "wings", "fantasy", "layering"],
        "craft": [
            "Overlapping heads use darker ink on top of lighter — stacked faces, not side-by-side stickers.",
            "Wing tatter: quarter blocks and diagonals on the outer edge only.",
            "Sphinx pose: foreground arms anchor; tail recedes with fewer inks.",
        ],
    },
]

CATEGORY_MAP = {
    "portrait": ["portrait", "face"],
    "face": ["portrait", "face"],
    "figure": ["figure", "creature", "animal", "pose"],
    "animal": ["figure", "animal", "creature"],
    "creature": ["figure", "creature", "fantasy"],
    "place": ["place", "landscape", "architecture", "building", "city"],
    "landscape": ["place", "landscape"],
    "architecture": ["place", "architecture", "building"],
    "scene": ["scene", "portrait", "figure"],
    "panels": ["panels", "ui"],
    "ui": ["panels", "ui"],
    "op-art": ["op-art", "abstract", "opart", "illusion", "moire"],
    "abstract": ["op-art", "abstract", "geometric"],
}


def _resolve_example_path(entry: dict[str, Any]) -> str:
    path = EXAMPLES / entry["file"]
    return str(path.resolve()) if path.is_file() else str(path)


def list_drawing_references(category: str | None = None) -> dict[str, Any]:
    """Return reference photos with craft notes. Study before painting; never trace."""
    cat = (category or "").strip().lower()
    tags = CATEGORY_MAP.get(cat, [cat] if cat else [])

    refs: list[dict[str, Any]] = []
    for entry in REFERENCE_CATALOG:
        if tags:
            study = [s.lower() for s in entry.get("study_for", [])]
            cat_match = entry.get("category", "").lower() in tags
            tag_match = any(t in study for t in tags)
            if not (cat_match or tag_match):
                continue
        refs.append(
            {
                "id": entry["id"],
                "path": _resolve_example_path(entry),
                "category": entry["category"],
                "subject": entry["subject"],
                "study_for": entry.get("study_for", []),
                "craft": entry.get("craft", []),
            }
        )

    return {
        "ok": True,
        "count": len(refs),
        "category_filter": category or None,
        "workflow": DRAWING_PASSES,
        "references": refs if refs else [
            {
                **{k: v for k, v in entry.items() if k != "craft"},
                "path": _resolve_example_path(entry),
                "craft": entry.get("craft", []),
            }
            for entry in REFERENCE_CATALOG
        ],
        "note": "Open reference images and read them before the first stroke. Quality bar is craft in these pieces, not glyph count.",
    }


def shading_ladder(background_ink: int = 0) -> dict[str, Any]:
    """Glyph brightness steps when the screen background uses background_ink (usually 0)."""
    return {
        "ok": True,
        "background_ink": background_ink,
        "background_name": C64_INK_NAMES[background_ink] if 0 <= background_ink < 16 else "unknown",
        "ladder": SHADING_LADDER,
        "outline": OUTLINE_GLYPHS,
        "accent_only": ACCENT_GLYPHS,
        "rule": "Change glyph before adding another ink. One glyph family per region.",
        "inverse_note": "Add 128 to a bank-0 id for inverse (mostly ink with a dark notch).",
    }


def illustration_brief(subject: str) -> dict[str, Any]:
    """Suggest references, inks, layout, and passes for a subject description."""
    text = subject.lower()
    category = "portrait"
    if any(
        w in text
        for w in (
            "op-art",
            "op art",
            "optical",
            "abstract",
            "moire",
            "moiré",
            "illusion",
            "vasarely",
            "riley",
            "plasma",
            "geometric",
            "tessellation",
            "girih",
            "arabesque",
            "islamic",
            "mandala",
            "yantra",
            "kolam",
            "rangoli",
            "hindu",
            "muqarnas",
            "lotus",
            "rug",
            "carpet",
            "oriental",
            "persian",
            "kilim",
            "turkish",
            "gul",
            "toranj",
            "charbagh",
        )
    ):
        category = "op-art"
    elif any(w in text for w in ("house", "city", "landscape", "building", "street", "architecture")):
        category = "place"
    elif any(w in text for w in ("tiger", "dragon", "animal", "creature", "monster", "wing")):
        category = "figure"
    elif any(w in text for w in ("panel", "ui", "menu", "label", "card")):
        category = "panels"

    if category == "op-art" and any(
        w in text for w in ("rug", "carpet", "oriental", "persian", "kilim", "ardabil", "gul", "charbagh")
    ):
        combo = "ardabil-medallion"
        if "gul" in text or "konya" in text or "tribal" in text:
            combo = "konya-gul"
        elif "garden" in text or "charbagh" in text or "isfahan" in text:
            combo = "garden-charbagh"
        elif "kilim" in text or "caucasian" in text or "band" in text:
            combo = "kilim-band-stack"
        elif any(w in text for w in ("indo", "fusion", "mughal", "kolam", "hindu", "mandala")):
            combo = "indo-persian-fusion"
        plan = rug_styles.combine_styles(combo)
        rug_study = world_art.study_world_art("oriental-rug")
        return {
            "ok": True,
            "subject": subject,
            "inferred_category": "oriental-rug",
            "combine_style": plan,
            "combinations_catalog": rug_styles.list_style_combinations().get("combinations", []),
            "world_art_study": rug_study,
            "palette_hint": plan.get("palette_hint", ""),
            "layout_hints": plan.get("study", []),
            "passes": op_art.OP_ART_PASSES,
            "tools_sequence": [
                "read petscii://world-art/references/rug",
                "read petscii://rugs/{combination}",
                "create_canvas",
                "stamp_combined_style",
                "update_project (animation_suggest)",
                "render_still",
                "critique_drawing(style='op-art')",
            ],
        }

    if category == "op-art":
        recipes = op_art.list_op_art_recipes()
        pick = "line-moire"
        if any(w in text for w in ("girih", "islamic", "alhambra", "star", "mosque", "eight-fold", "8-fold")):
            pick = "islamic-girih-8"
        elif any(w in text for w in ("arabesque", "border", "manuscript", "muqarnas")):
            pick = "arabesque-band"
        elif any(w in text for w in ("interlace", "strapwork")):
            pick = "islamic-interlace"
        elif any(w in text for w in ("mandala", "lotus", "thangka", "petal")):
            pick = "mandala-lotus"
        elif any(w in text for w in ("yantra", "sri", "bindu", "triangle nested")):
            pick = "yantra-triangles"
        elif any(w in text for w in ("kolam", "rangoli", "pulli", "diwali")):
            pick = "kolam-pulli"
        elif "bar" in text or "stripe" in text or "riley" in text:
            pick = "vertical-bars"
        elif "square" in text or "tunnel" in text or "concentric" in text:
            pick = "nested-squares"
        elif "triangle" in text or "tess" in text:
            pick = "triangle-tessellation"
        elif "plasma" in text or "color" in text:
            pick = "plasma-field"
        elif "weave" in text or "diagonal" in text:
            pick = "diagonal-weave"
        elif "checker" in text or "chess" in text:
            pick = "dual-checker"
        elif "ring" in text or "radial" in text or "target" in text:
            pick = "ring-bands"
        recipe = op_art.op_art_recipe(pick)
        tradition_study = None
        if any(w in text for w in ("islamic", "girih", "arabesque", "muqarnas", "mosque")):
            tradition_study = world_art.study_world_art("islamic")
        elif any(w in text for w in ("hindu", "mandala", "yantra", "kolam", "rangoli", "lotus")):
            tradition_study = world_art.study_world_art("hindu")
        palette_hint = "Two high-contrast inks first; add a third only for animation accent."
        if tradition_study and tradition_study.get("ok"):
            palette_hint = tradition_study.get("petscii_mapping", [palette_hint])[0]
        return {
            "ok": True,
            "subject": subject,
            "inferred_category": category,
            "world_art_study": tradition_study,
            "palette_hint": palette_hint,
            "layout_hints": [
                "Full canvas lattice; symmetry break in exactly one place.",
                "Period P is intentional — moiré needs P and P±1 layers, not random density.",
                "Motion: stack parallax + color or backdrop at different cycle rates.",
            ],
            "passes": op_art.OP_ART_PASSES,
            "op_art_recipe": recipe,
            "op_art_catalog": recipes.get("recipes", []),
            "tools_sequence": [
                "illustration_brief",
                "create_canvas",
                "stamp_op_art (lattice)",
                "paint_cells (focal-break pass)",
                "update_project (animation_suggest)",
                "render_animation",
                "critique_drawing(style='op-art')",
            ],
        }

    refs = list_drawing_references(category)
    layout_hints: list[str] = []
    if category == "portrait":
        layout_hints = [
            "Crop forehead to upper chest; eyes in rows 5–11 on a 25-row canvas.",
            "Face width ~14–20 columns on 40 columns; leave one ink for accent only.",
            "Paint black hair and shadow as ink 0, not empty cells.",
        ]
    elif category == "place":
        layout_hints = [
            "Horizon near row 14–17; subject building centered or rule-of-thirds.",
            "Background: one repeating mid-tone glyph; focal windows stay white or yellow.",
        ]
    elif category == "figure":
        layout_hints = [
            "Silhouette touches three frame edges where possible.",
            "Focal detail (eyes, emblem) gets the only saturated accent ink.",
        ]
    else:
        layout_hints = [
            "Reserve margins; align labels to a simple grid.",
        ]

    palette_hint = (
        "Portrait: white + light green or light blue (lit), brown or purple (shadow), one accent red/yellow."
        if category == "portrait"
        else "Architecture: up to four inks; try grayscale like IMG_0359 before adding hue."
        if category == "place"
        else "Figure: three body inks plus black; accent only on eyes or props."
    )

    return {
        "ok": True,
        "subject": subject,
        "inferred_category": category,
        "palette_hint": palette_hint,
        "layout_hints": layout_hints,
        "passes": DRAWING_PASSES,
        "references": refs.get("references", [])[:6],
        "shading": shading_ladder(0),
        "tools_sequence": [
            "illustration_brief or petscii://references/drawing/{category}",
            "create_canvas",
            "set_tool_state",
            "paint_cells / fill / draw_line (passes 1–4)",
            "read_grid",
            "render_still",
            "critique_drawing",
        ],
    }


def _focal_band_stats(
    grid: list[str],
    cell_colors: list[int],
    columns: int,
    rows: int,
) -> dict[str, Any]:
    """Upper-center band where portrait focal detail usually lives."""
    y0, y1 = max(0, rows // 5), min(rows, (rows * 11) // 25 + 4)
    x0, x1 = columns // 4, (columns * 3) // 4
    painted = 0
    solids = 0
    textured = 0
    inks: set[int] = set()
    for y in range(y0, y1):
        for x in range(x0, x1):
            idx = y * columns + x
            if idx >= len(grid) or grid[idx] == "":
                continue
            painted += 1
            g = int(grid[idx])
            if g == 160:
                solids += 1
            elif g not in (225, 97):
                textured += 1
            if idx < len(cell_colors):
                inks.add(int(cell_colors[idx]))
    return {
        "rows": [y0, y1],
        "cols": [x0, x1],
        "painted": painted,
        "solid_ratio": round(solids / painted, 2) if painted else 0.0,
        "texture_ratio": round(textured / painted, 2) if painted else 0.0,
        "inks_in_band": sorted(inks),
    }


def _infer_critique_style(
    coverage: float,
    focal_painted: int,
    glyph_count: int,
    style: str | None,
) -> str:
    normalized = (style or "auto").strip().lower()
    if normalized in ("op-art", "abstract", "opart", "geometric"):
        return "op-art"
    if normalized in ("portrait", "figure", "illustration", "representational"):
        return "illustration"
    if coverage >= 0.5 and focal_painted < 12 and glyph_count <= 6:
        return "op-art"
    return "illustration"


def critique_drawing(project_path: str, style: str | None = "auto") -> dict[str, Any]:
    """
    Heuristic quality review against reference-artist habits.

    Loads the project JSON from disk; does not render pixels.
  style: auto, illustration, op-art (abstract).
    """
    path = Path(project_path).expanduser().resolve()
    if not path.is_file():
        return {"ok": False, "error": f"project not found: {path}"}

    data = json.loads(path.read_text(encoding="utf-8"))
    columns = int(data.get("columns", 40))
    rows = int(data.get("rows", 25))
    grid = data.get("grid") or []
    cell_colors = data.get("cellColors") or []
    cells = len(grid)

    occupied = sum(1 for g in grid if g != "")
    coverage = occupied / cells if cells else 0.0

    glyph_hist: dict[int, int] = {}
    ink_hist: dict[int, int] = {}
    solid_interior = 0
    textured = 0
    for idx, glyph in enumerate(grid):
        if glyph == "":
            continue
        g = int(glyph)
        glyph_hist[g] = glyph_hist.get(g, 0) + 1
        ink = int(cell_colors[idx]) if idx < len(cell_colors) else 0
        ink_hist[ink] = ink_hist.get(ink, 0) + 1
        if g == 160:
            solid_interior += 1
        elif g not in ACCENT_GLYPHS:
            textured += 1

    solid_ratio = solid_interior / occupied if occupied else 0.0
    texture_ratio = textured / occupied if occupied else 0.0
    ink_count = len(ink_hist)

    focal = _focal_band_stats(grid, cell_colors, columns, rows)
    critique_style = _infer_critique_style(
        coverage,
        focal["painted"],
        len(glyph_hist),
        style,
    )

    if critique_style == "op-art":
        op_review = op_art.critique_op_art(grid, cell_colors, columns, rows)
        return {
            "ok": True,
            "project": str(path),
            "critique_style": critique_style,
            "columns": columns,
            "rows": rows,
            **op_review,
            "passes": op_art.OP_ART_PASSES,
            "recipes": op_art.list_op_art_recipes().get("recipes", []),
        }

    issues: list[dict[str, str]] = []
    study: list[str] = []
    next_steps: list[str] = []

    if coverage < 0.12:
        issues.append(
            {
                "code": "sparse_canvas",
                "message": "Less than ~12% of cells are painted — subject should fill the frame like the references.",
            }
        )
        study.append("IMG_0346")
        next_steps.append("Pass 1: block silhouette with solid 160 to ~35–55% coverage.")
    elif coverage > 0.92:
        issues.append(
            {
                "code": "overfilled",
                "message": "Nearly every cell is painted — backgrounds usually stay simple bands or patterns.",
            }
        )
        study.append("IMG_0359")
        next_steps.append("Erase non-subject regions; keep one repeating backdrop glyph.")

    if ink_count > 6:
        issues.append(
            {
                "code": "too_many_inks",
                "message": f"{ink_count} inks in use — master portraits use about three inks plus black and one accent.",
            }
        )
        study.append("IMG_0354")
        next_steps.append("Recolor non-accent areas to three structural inks; keep one warm/cool accent.")

    if occupied > 40 and texture_ratio < 0.08 and solid_ratio > 0.75:
        issues.append(
            {
                "code": "flat_solids",
                "message": "Most painted cells are solid 160 — run the texture pass with checker/diagonals.",
            }
        )
        study.append("IMG_0355")
        next_steps.append(
            "Pass 4: replace lit-area 160 with 102; mid bands with 77 or 78; leave shadow areas dense."
        )

    if focal["painted"] < 8:
        issues.append(
            {
                "code": "weak_focal",
                "message": "Upper-center focal band has almost no detail — eyes and face usually live there.",
            }
        )
        study.append("IMG_0357")
        next_steps.append("Pass 3: add eyes and mouth in rows 5–11; white catchlight on dark pupil.")
    elif focal["solid_ratio"] > 0.9 and focal["painted"] > 20:
        issues.append(
            {
                "code": "flat_face",
                "message": "Focal band is almost all solid blocks — add line and checker glyphs for skin.",
            }
        )
        study.append("IMG_0354")
        next_steps.append("Add wrinkle lines and cheek checkers before adding more colors.")

    for accent in ACCENT_GLYPHS:
        if glyph_hist.get(accent, 0) > occupied * 0.05:
            issues.append(
                {
                    "code": "accent_glyph_overuse",
                    "message": f"Glyph {accent} used heavily — slots/scans are accents, not fill.",
                }
            )
            study.append("IMG_0359")
            next_steps.append("Swap interior 103/111/116 for 102 or 77/78.")

    score = 100
    score -= len(issues) * 15
    score = max(0, min(100, score))

    if not issues:
        next_steps.append("Render still and compare visually to the closest reference id.")
    if not study:
        if coverage < 0.3:
            study = ["IMG_0346", "IMG_0354"]
        else:
            study = ["IMG_0357", "IMG_0360"]

    ref_details = [
        {
            "id": rid,
            "path": _resolve_example_path(next(e for e in REFERENCE_CATALOG if e["id"] == rid)),
            "subject": next(e for e in REFERENCE_CATALOG if e["id"] == rid)["subject"],
        }
        for rid in study
        if any(e["id"] == rid for e in REFERENCE_CATALOG)
    ]

    return {
        "ok": True,
        "project": str(path),
        "critique_style": critique_style,
        "columns": columns,
        "rows": rows,
        "stats": {
            "occupied_cells": occupied,
            "coverage": round(coverage, 3),
            "ink_count": ink_count,
            "inks": {str(k): C64_INK_NAMES[k] if 0 <= k < 16 else str(k) for k in sorted(ink_hist)},
            "solid_ratio": round(solid_ratio, 3),
            "texture_ratio": round(texture_ratio, 3),
            "top_glyphs": sorted(glyph_hist.items(), key=lambda x: -x[1])[:8],
            "focal_band": focal,
        },
        "score": score,
        "issues": issues,
        "study_references": ref_details,
        "next_steps": next_steps,
        "passes": DRAWING_PASSES,
    }