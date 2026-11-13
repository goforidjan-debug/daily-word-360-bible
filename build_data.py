"""Build the Bible App data files from the WEB (World English Bible) JSON.

Source: thiagobodruk/bible `json/en_web.json` (World English Bible, public
domain). The raw dataset has spacing artifacts (spaces before punctuation,
spaces inside quotes) and an inlined footnote artifact ` (Elohim)`; this
script cleans both. Legitimate WEB parentheticals (e.g. "(also called
Hebron)") are kept.

Outputs in ~/workspace/bible-app/:
  books.json        index of the 66 books (slug, name, abbrev, testament, chapters)
  books/<slug>.json one file per book: {name, abbrev, testament, chapters: [[v,...],...]}
  daily-verses.json curated daily-verse list (ref + WEB text)
"""
import json, re, os

SRC = '/tmp/en_web.json'
OUT = '/home/hatch/workspace/bible-app'

def slugify(name):
    return re.sub(r'[^a-z0-9]+', '', name.lower())

def clean(v):
    # Remove the inlined footnote artifact (with its stray opening quote
    # and the period that belonged to it: 'God " (Elohim). created').
    v = re.sub(r'\s*"\s*\(Elohim\)\.?', '', v)
    v = re.sub(r'\s*\(Elohim\)\.?', '', v)
    # Space before punctuation -> attach punctuation.
    v = re.sub(r'\s+([,.;:?!%])', r'\1', v)
    # Space after an OPENING quote / paren. The quote must be preceded by
    # the start of the string, whitespace, or an opening bracket — otherwise
    # it is a closing quote (e.g. 'light," and') and its space must stay.
    v = re.sub(r'(^|[\s\(\[])(["\u201c])\s+', r'\1\2', v)
    # Space before closing paren/bracket (quotes are handled by the
    # lookahead rule below, so opening quotes keep their space).
    v = re.sub(r'\s+([\)\]])', r'\1', v)
    # Space before closing quote when followed by punctuation or end.
    v = re.sub(r'\s+([”"])(?=[,.;:?!]|$)', r'\1', v)
    # Collapse whitespace.
    v = re.sub(r'\s+', ' ', v).strip()
    return v

data = json.load(open(SRC))
assert len(data) == 66, len(data)

OT = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua',
      'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
      '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job',
      'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah',
      'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel',
      'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
      'Haggai', 'Zechariah', 'Malachi']

index = []
total_verses = 0
for b in data:
    name = b['name']
    slug = slugify(name)
    testament = 'OT' if name in OT else 'NT'
    chapters = [[clean(v) for v in ch] for ch in b['chapters']]
    total_verses += sum(len(ch) for ch in chapters)
    book = {'name': name, 'abbrev': b['abbrev'], 'testament': testament,
            'chapters': chapters}
    with open(f'{OUT}/books/{slug}.json', 'w') as f:
        json.dump(book, f, ensure_ascii=False, separators=(',', ':'))
    index.append({'slug': slug, 'name': name, 'abbrev': b['abbrev'],
                  'testament': testament, 'chapters': len(chapters)})

with open(f'{OUT}/books.json', 'w') as f:
    json.dump(index, f, ensure_ascii=False, separators=(',', ':'))

print('books:', len(index), 'verses:', total_verses)

# --- spot checks ---
def verse(book_name, ch, v):
    b = next(x for x in data if x['name'] == book_name)
    return clean(b['chapters'][ch - 1][v - 1])

checks = [
    ('Genesis', 1, 1),
    ('John', 3, 16),
    ('Psalms', 23, 1),
    ('Philippians', 4, 13),
    ('Psalms', 119, 105),
]
for bk, ch, v in checks:
    print(f'{bk} {ch}:{v} ->', verse(bk, ch, v))

# --- curated daily verses (single verses, WEB text) ---
DAILY_REFS = [
    ('John', 3, 16), ('Psalms', 23, 1), ('Philippians', 4, 13),
    ('Jeremiah', 29, 11), ('Proverbs', 3, 5), ('Isaiah', 41, 10),
    ('Joshua', 1, 9), ('Psalms', 27, 1), ('Matthew', 11, 28),
    ('Psalms', 46, 1), ('Romans', 15, 13), ('Lamentations', 3, 22),
    ('Romans', 8, 28), ('Psalms', 119, 105), ('Isaiah', 40, 31),
    ('Matthew', 6, 33), ('Psalms', 34, 8), ('John', 14, 27),
    ('Proverbs', 18, 10), ('Psalms', 37, 4), ('Galatians', 5, 22),
    ('Hebrews', 11, 1), ('Psalms', 118, 24), ('1 Peter', 5, 7),
    ('Psalms', 19, 1), ('Isaiah', 26, 3), ('Matthew', 5, 16),
    ('Psalms', 91, 1), ('John', 8, 12), ('Romans', 12, 2),
]
daily = []
for bk, ch, v in DAILY_REFS:
    daily.append({'ref': f'{bk} {ch}:{v}', 'text': verse(bk, ch, v)})
with open(f'{OUT}/daily-verses.json', 'w') as f:
    json.dump(daily, f, ensure_ascii=False, indent=1)
print('daily verses:', len(daily))
for d in daily[:3]:
    print(' ', d['ref'], '->', d['text'][:100])
