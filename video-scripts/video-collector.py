import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_URL = "https://www.talkinghands.co.in/category/human-body-and-parts"
# put here category name link

headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/137.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
}

response = requests.get(BASE_URL,headers=headers)
soup = BeautifulSoup(response.text, "html.parser")

DOWNLOAD_FOLDER = "sign-videos"
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

session = requests.Session()
session.headers.update(headers)

# ----------------------------
# Get main page
# ----------------------------
response = session.get(BASE_URL)
response.raise_for_status()

soup = BeautifulSoup(response.text, "html.parser")

links = soup.select("div.item-list span.field-content > a")

print(f"Found {len(links)} pages")

# ----------------------------
# Visit every page
# ----------------------------
for link in links:
    title = link.get_text(strip=True)
    page_url = urljoin(BASE_URL, link["href"])

    print(f"Processing: {title}")

    page = session.get(page_url)
    page.raise_for_status()

    page_soup = BeautifulSoup(page.text, "html.parser")

    source = page_soup.select_one(
        "div.sign-video-media video source"
    )

    if source is None:
        print(f"Video not found for {title}")
        continue

    video_url = urljoin(BASE_URL, source["src"])

    filename = os.path.basename(video_url)

    print("Downloading:", filename)

    r = session.get(video_url, stream=True)
    r.raise_for_status()

    with open(os.path.join(DOWNLOAD_FOLDER, filename), "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)

print("Done!")