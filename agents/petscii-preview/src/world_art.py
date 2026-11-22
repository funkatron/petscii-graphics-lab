"""Study notes: Islamic geometric art and Hindu sacred geometry for PETSCII MCP."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import rug_styles

AGENT_ROOT = Path(__file__).resolve().parents[1]
WORLD_ART_DIR = AGENT_ROOT / "examples" / "world-art"

WORLD_ART_REFERENCES: list[dict[str, Any]] = [
    {
        "id": "met-12star",
        "file": "met-12star-girih-tile.jpg",
        "tradition": "islamic",
        "subject": "Twelve-point star tile, Timurid cuerda seca (MET 17.143.1)",
        "study_for": ["girih", "star", "tile", "palette"],
        "recipe": "islamic-girih-8",
        "commons": "https://commons.wikimedia.org/wiki/File:Twelve-Pointed_Star-Shaped_Tile_MET_DT11977.jpg",
        "license": "CC0",
        "craft": [
            "Black outline separates glaze fields — like PETSCII ink boundaries.",
            "Star arms meet at nodes; interior rosettes are secondary period inside the star.",
            "Polychrome but reads as few inks from distance.",
        ],
    },
    {
        "id": "wazir-khan-arch",
        "file": "wazir-khan-arch-girih.jpg",
        "tradition": "islamic",
        "subject": "Wazir Khan Mosque arch girih panels",
        "study_for": ["interlace", "arch", "mosque"],
        "recipe": "islamic-interlace",
        "commons": "https://commons.wikimedia.org/wiki/File:Arch_Wazir_Khan.jpg",
        "license": "See Commons file page",
        "craft": [
            "Large field of strapwork; depth from ink value, not perspective.",
            "Frame the PETSCII piece with dense sides, calmer center.",
        ],
    },
    {
        "id": "girih-compass",
        "file": "girih-compass-example.svg",
        "tradition": "islamic",
        "subject": "Girih construction diagram (compass + straightedge)",
        "study_for": ["construction", "period", "girih"],
        "recipe": "islamic-girih-8",
        "commons": "https://commons.wikimedia.org/wiki/File:Girih_compass_straightedge_example.svg",
        "license": "CC BY-SA 3.0",
        "craft": [
            "Period comes from construction — mirror that with stamp period, not guesswork.",
            "Decagon/bowtie vocabulary maps to 77/78 + line crossings on grid.",
        ],
    },
    {
        "id": "sri-yantra-johari",
        "file": "sri-yantra-johari-1974.jpg",
        "tradition": "hindu",
        "subject": "Sri Yantra with traditional colors (Johari)",
        "study_for": ["yantra", "sri", "bindu", "triangle"],
        "recipe": "yantra-triangles",
        "commons": "https://commons.wikimedia.org/wiki/File:Sri_Yantra_Correct_Colors_Johari_1974.jpg",
        "license": "Public domain (uploader release)",
        "craft": [
            "Nested triangles; center bindu is the only perfect focal cell.",
            "Pink/green/yellow are roles — map to C64 oranges, greens, yellows sparingly.",
        ],
    },
    {
        "id": "kolam-32-dots",
        "file": "kolam-32-dots.jpg",
        "tradition": "hindu",
        "subject": "32-dot pulli kolam (symmetric loop)",
        "study_for": ["kolam", "rangoli", "pulli", "diwali"],
        "recipe": "kolam-pulli",
        "commons": "https://commons.wikimedia.org/wiki/File:32_Dots_Rangoli.jpg",
        "license": "See Commons file page",
        "craft": [
            "Dots first, then one continuous line mental path — most canvas stays empty.",
            "Symmetry across both axes; festival color is accent on the loop only.",
        ],
    },
    {
        "id": "ardabil-carpet",
        "file": "ardabil-carpet.jpg",
        "tradition": "rug",
        "subject": "Ardabil Carpet (Safavid medallion field)",
        "study_for": ["rug", "carpet", "ardabil", "toranj", "medallion", "persian"],
        "recipe": "ardabil-medallion",
        "commons": "https://commons.wikimedia.org/wiki/File:Ardabil_Carpet.jpg",
        "license": "Public domain (PD-Art)",
        "craft": [
            "Central toranj dominates; field filler is small repeat.",
            "Multiple border strips — in PETSCII: margin overwrite layers.",
        ],
    },
    {
        "id": "konya-memling-gul",
        "file": "konya-memling-gul.jpg",
        "tradition": "rug",
        "subject": "Konya carpet, Memling gül repeat",
        "study_for": ["rug", "gul", "anatolian", "tribal", "konya"],
        "recipe": "konya-gul",
        "commons": "https://commons.wikimedia.org/wiki/File:Konya_18th_carpet_with_Memling_gul_design.jpg",
        "license": "Public domain (PD-Art)",
        "craft": [
            "Repeating octagonal gül, not one center — use rug-gul-repeat.",
            "Earth reds and browns; narrow glyph set per gül.",
        ],
    },
    {
        "id": "isfahan-garden-carpet",
        "file": "isfahan-garden-carpet.jpg",
        "tradition": "rug",
        "subject": "Isfahan garden (chahar bagh) carpet",
        "study_for": ["rug", "garden", "charbagh", "isfahan", "persian"],
        "recipe": "garden-charbagh",
        "commons": "https://commons.wikimedia.org/wiki/File:Isfahan_Garden_carpet.jpg",
        "license": "Public domain (PD-Art)",
        "craft": [
            "Cross canals divide four planted quadrants.",
            "Combine with arabesque-band border in stamp_combined_style.",
        ],
    },
]


def _ref_path(entry: dict[str, Any]) -> str:
    path = WORLD_ART_DIR / entry["file"]
    return str(path.resolve()) if path.is_file() else str(path)


def list_world_art_references(tradition: str | None = None) -> dict[str, Any]:
    """Local + Commons URLs for Islamic/Hindu study images."""
    key = (tradition or "all").strip().lower()
    refs = WORLD_ART_REFERENCES
    if key not in ("all", "", "both"):
        if key in ("islamic", "islam", "girih", "arabesque"):
            refs = [r for r in refs if r["tradition"] == "islamic"]
        elif key in ("hindu", "mandala", "yantra", "kolam", "rangoli"):
            refs = [r for r in refs if r["tradition"] == "hindu"]
        elif key in ("rug", "carpet", "oriental", "persian", "kilim", "turkish", "anatolian"):
            refs = [r for r in refs if r["tradition"] == "rug"]
        else:
            refs = [
                r
                for r in refs
                if key in r["study_for"] or key in r["id"] or key in r["recipe"]
            ]
    catalog = [
        {
            **entry,
            "path": _ref_path(entry),
            "on_disk": (WORLD_ART_DIR / entry["file"]).is_file(),
        }
        for entry in refs
    ]
    return {
        "ok": True,
        "count": len(catalog),
        "directory": str(WORLD_ART_DIR.resolve()),
        "tradition_filter": tradition or None,
        "references": catalog,
        "commons_categories": [
            "https://commons.wikimedia.org/wiki/Category:Girih",
            "https://commons.wikimedia.org/wiki/Category:Hindu_mandalas",
            "https://commons.wikimedia.org/wiki/Category:Rangoli",
            "https://commons.wikimedia.org/wiki/Category:SVG_yantras",
            "https://commons.wikimedia.org/wiki/Category:Oriental_rugs",
            "https://commons.wikimedia.org/wiki/Category:Persian_carpets",
        ],
        "note": "Open path images before stamp_op_art. Honor Commons licenses for any redistribution.",
    }

WORLD_ART_STUDY: dict[str, dict[str, Any]] = {
    "islamic": {
        "title": "Islamic geometric & arabesque traditions",
        "traditions": [
            "Girih strapwork — interlocking stars and polygons from compass-and-straightedge ratios.",
            "Muqarnas — stacked niches read as depth bands on a flat screen.",
            "Arabesque — repeating vine-like curves; on PETSCII, imply curves with diagonal period tiles.",
            "Calligraphic borders — dense band top/bottom, calm field center (Thuluth shape implied, not typed).",
        ],
        "petscii_mapping": [
            "8- or 10-fold symmetry: period-4 or period-5 tiles, never arbitrary glyph scatter.",
            "Interlace: two directions of diagonal (77/78) with one ink; crossings stay the same glyph family.",
            "Stars: ring of 160 at lattice nodes; interiors 102 checker; background ink 0 or deep blue (7).",
            "Palette: white/gold on ultramarine (1/7/8) or teal-cyan (3/6/14) — two structural inks + gold accent.",
            "Avoid literal figurative in mosque-style pieces; geometry is the subject.",
        ],
        "stamp_recipes": [
            "islamic-girih-8",
            "arabesque-band",
            "islamic-interlace",
        ],
        "masters_to_remember": [
            "Great Mosque of Córdoba horseshoe rhythm (repetition + calm field).",
            "Alhambra tile stars (8-fold girih).",
            "Mamluk/Qur'an frontispiece borders (band + center).",
        ],
        "animation": "Slow scroll-x on interlace; backdrop field 'wave' or 'glow' at low cycles — motion should feel contemplative.",
    },
    "hindu": {
        "title": "Hindu mandala, yantra, and kolam",
        "traditions": [
            "Mandala — radial symmetry, lotus petals, concentric rings, deity seat at center.",
            "Yantra (e.g. Sri Yantra) — nested triangles, bindu dot center, upward/downward balance.",
            "Kolam / rangoli — dot grid (pulli), looped lines between dots; transient floor art.",
            "Temple art — gopuram silhouette, column bands, festival color accents.",
        ],
        "petscii_mapping": [
            "Radials: center at (20, 12) on 40×25; petal count 8 or 12 — one wedge template, rotate by columns.",
            "Lotus: quarter blocks (126/123) on rings; outer petals solid 160, inner bindu one white cell.",
            "Yantra: stacked triangles with 95 (up) and 105 (down); count odd rings; center dot is sacred focal.",
            "Kolam: sparse dots at period 3–4; connect with 67/68 — leave negative space, not full fill.",
            "Palette: saffron/orange (8), vermillion (2), marigold yellow (7), white (1), deep purple (4) — one accent.",
        ],
        "stamp_recipes": [
            "mandala-lotus",
            "yantra-triangles",
            "kolam-pulli",
        ],
        "masters_to_remember": [
            "Buddhist/Hindu mandala thangka layout (rings of merit).",
            "Tamil kolam morning diagrams (symmetry + closure).",
            "Temple gopuram tier stacking (horizontal bands of story).",
        ],
        "animation": "Ripple or slow color-cycle on mandala; kolam often still — optional gentle color-glow only.",
    },
    "oriental-rug": {
        "title": "Oriental carpets & flatweaves",
        "traditions": [
            "Medallion carpets — toranj center, herati or girih field, nested borders (Ardabil).",
            "Gül repeat — tribal octagons tile the field (Konya / Turkmen).",
            "Garden carpets — chahar bagh water cross + four planted quarters.",
            "Kilim — horizontal serrated bands, flat diagrammatic color.",
        ],
        "petscii_mapping": [
            "Layout beats motif: border margin → field repeat → center medallion (overwrite layers).",
            "Combine traditions with stamp_combined_style — Islamic field + Hindu toranj + kolam corners.",
            "Field recipe separate from border; guard strip 2–3 cells.",
            "Palette: blue-red-cream (Persian) or brown-red-ivory (Anatolian); max 4 inks.",
        ],
        "stamp_recipes": [
            "rug-gul-repeat",
            "rug-charbagh",
            "rug-kilim-bands",
        ],
        "combine_styles": [
            "ardabil-medallion",
            "konya-gul",
            "garden-charbagh",
            "indo-persian-fusion",
            "kilim-band-stack",
        ],
        "masters_to_remember": [
            "Ardabil (V&A) — toranj + lamp niches + border hierarchy.",
            "Indo-Persian workshops — merge floral Indian and Persian geometry.",
            "Caucasian kilim — band stack, no medallion.",
        ],
        "animation": "Usually still; gentle color-glow or slow scroll along one border band only.",
    },
}


def study_world_art(tradition: str | None = None) -> dict[str, Any]:
    """Return craft study for islamic, hindu, or both."""
    key = (tradition or "all").strip().lower()
    if key in ("all", "", "both", "world"):
        return {
            "ok": True,
            "traditions": list(WORLD_ART_STUDY.keys()),
            "studies": WORLD_ART_STUDY,
            "reference_examples": list_world_art_references(),
            "mcp_workflow": [
                "petscii://world-art/references/{tradition} — open local study images",
                "petscii://world-art/islamic | petscii://world-art/hindu",
                "illustration_brief('Islamic girih star' | 'Hindu mandala')",
                "stamp_op_art(recipe from stamp_recipes)",
                "paint_cells (bindu, border calligraphy accent, or one petal break)",
                "critique_drawing(style='op-art')",
            ],
        }
    if key in ("islamic", "islam", "muslim", "girih", "arabesque", "muqarnas"):
        return {
            "ok": True,
            **WORLD_ART_STUDY["islamic"],
            "reference_examples": list_world_art_references("islamic"),
        }
    if key in ("hindu", "mandala", "yantra", "kolam", "rangoli", "lotus", "sri"):
        return {
            "ok": True,
            **WORLD_ART_STUDY["hindu"],
            "reference_examples": list_world_art_references("hindu"),
        }
    if key in (
        "rug",
        "oriental",
        "carpet",
        "persian",
        "kilim",
        "turkish",
        "anatolian",
        "oriental-rug",
    ):
        return {
            "ok": True,
            **WORLD_ART_STUDY["oriental-rug"],
            "reference_examples": list_world_art_references("rug"),
            "combinations": rug_styles.list_style_combinations(),
        }
    return {
        "ok": False,
        "error": f"unknown tradition {tradition!r}",
        "known": ["islamic", "hindu", "oriental-rug", "rug", "all"],
    }