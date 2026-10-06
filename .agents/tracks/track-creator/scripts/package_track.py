#!/usr/bin/env python3
"""
Track Packager - Creates a distributable .track file of a track folder

Usage:
    python utils/package_track.py <path/to/track-folder> [output-directory]

Example:
    python utils/package_track.py tracks/public/my-track
    python utils/package_track.py tracks/public/my-track ./dist
"""

import fnmatch
import sys
import zipfile
from pathlib import Path
from scripts.quick_validate import validate_track

# Patterns to exclude when packaging tracks.
EXCLUDE_DIRS = {"__pycache__", "node_modules"}
EXCLUDE_GLOBS = {"*.pyc"}
EXCLUDE_FILES = {".DS_Store"}
# Directories excluded only at the track root (not when nested deeper).
ROOT_EXCLUDE_DIRS = {"evals"}


def should_exclude(rel_path: Path) -> bool:
    """Check if a path should be excluded from packaging."""
    parts = rel_path.parts
    if any(part in EXCLUDE_DIRS for part in parts):
        return True
    # rel_path is relative to track_path.parent, so parts[0] is the track
    # folder name and parts[1] (if present) is the first subdir.
    if len(parts) > 1 and parts[1] in ROOT_EXCLUDE_DIRS:
        return True
    name = rel_path.name
    if name in EXCLUDE_FILES:
        return True
    return any(fnmatch.fnmatch(name, pat) for pat in EXCLUDE_GLOBS)


def package_track(track_path, output_dir=None):
    """
    Package a track folder into a .track file.

    Args:
        track_path: Path to the track folder
        output_dir: Optional output directory for the .track file (defaults to current directory)

    Returns:
        Path to the created .track file, or None if error
    """
    track_path = Path(track_path).resolve()

    # Validate track folder exists
    if not track_path.exists():
        print(f"❌ Error: Track folder not found: {track_path}")
        return None

    if not track_path.is_dir():
        print(f"❌ Error: Path is not a directory: {track_path}")
        return None

    # Validate TRACK.md exists
    track_md = track_path / "TRACK.md"
    if not track_md.exists():
        print(f"❌ Error: TRACK.md not found in {track_path}")
        return None

    # Run validation before packaging
    print("🔍 Validating track...")
    valid, message = validate_track(track_path)
    if not valid:
        print(f"❌ Validation failed: {message}")
        print("   Please fix the validation errors before packaging.")
        return None
    print(f"✅ {message}\n")

    # Determine output location
    track_name = track_path.name
    if output_dir:
        output_path = Path(output_dir).resolve()
        output_path.mkdir(parents=True, exist_ok=True)
    else:
        output_path = Path.cwd()

    track_filename = output_path / f"{track_name}.track"

    # Create the .track file (zip format)
    try:
        with zipfile.ZipFile(track_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Walk through the track directory, excluding build artifacts
            for file_path in track_path.rglob('*'):
                if not file_path.is_file():
                    continue
                arcname = file_path.relative_to(track_path.parent)
                if should_exclude(arcname):
                    print(f"  Skipped: {arcname}")
                    continue
                zipf.write(file_path, arcname)
                print(f"  Added: {arcname}")

        print(f"\n✅ Successfully packaged track to: {track_filename}")
        return track_filename

    except Exception as e:
        print(f"❌ Error creating .track file: {e}")
        return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python utils/package_track.py <path/to/track-folder> [output-directory]")
        print("\nExample:")
        print("  python utils/package_track.py tracks/public/my-track")
        print("  python utils/package_track.py tracks/public/my-track ./dist")
        sys.exit(1)

    track_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"📦 Packaging track: {track_path}")
    if output_dir:
        print(f"   Output directory: {output_dir}")
    print()

    result = package_track(track_path, output_dir)

    if result:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
