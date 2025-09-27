const TMDB_API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5YTM0Mjg2ZDk4YmMxMDZjMzdmOTY1NzE1MTFlZWE4YSIsIm5iZiI6MTc1NzAzODI0NC44NTQsInN1YiI6IjY4YmE0NmE0MTk2YzE2NDEyMzk4YjBhOCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ._fkgdodaqRSZTatNx-8j9er-AmQJb1eQRm3-RFwsX5w";  
const OMDB_API_KEY = "118ac578";

let lastTitle = "";

function getNetflixTitle() {
  return document.title.replace(" - Netflix", "").trim();
}

async function fetchTMDbInfo(title) {
  try {
    const url = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}&language=en-US`;
    const searchRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TMDB_API_KEY}`,
        accept: "application/json"
      }
    });

    const searchData = await searchRes.json();
    if (!searchData.results || searchData.results.length === 0) return null;

    const firstResult = searchData.results.find(r => r.vote_count > 0) || searchData.results[0];

    const detailsUrl = `https://api.themoviedb.org/3/${firstResult.media_type}/${firstResult.id}?language=en-US&append_to_response=external_ids`;
    const detailsRes = await fetch(detailsUrl, {
      headers: {
        Authorization: `Bearer ${TMDB_API_KEY}`,
        accept: "application/json"
      }
    });

    const detailsData = await detailsRes.json();

    return {
      title: firstResult.title || firstResult.name,
      tmdbRating: firstResult.vote_average,
      votes: firstResult.vote_count,
      imdbId: detailsData.external_ids?.imdb_id || null,
      tmdbUrl: `https://www.themoviedb.org/${firstResult.media_type}/${firstResult.id}`
    };
  } catch (err) {
    console.error("❌ TMDb fetch error:", err);
    return null;
  }
}

async function fetchOMDbRatings(imdbId) {
  if (!imdbId) return null;

  try {
    const url = `https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.Response === "False") return null;

    const rt = data.Ratings.find(r => r.Source === "Rotten Tomatoes");
    const mc = data.Ratings.find(r => r.Source === "Metacritic");

    return {
      imdb: data.imdbRating,
      rt: rt ? rt.Value : null,
      mc: mc ? mc.Value : null,
      imdbUrl: `https://www.imdb.com/title/${imdbId}/`
    };
  } catch (err) {
    console.error("❌ OMDb fetch error:", err);
    return null;
  }
}

function insertRatings(tmdbData, omdbData) {
  const infoContainer =
    document.querySelector(".previewModal--detailsMetadata-right") || 
    document.querySelector(".title-info-metadata-wrapper"); 

  if (!infoContainer) return;

  let overlay = infoContainer.querySelector(".ratings-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "ratings-overlay";
    infoContainer.insertBefore(overlay, infoContainer.firstChild); 
  }

  let html = "";
  if (omdbData?.imdb) html += `⭐ IMDb: ${omdbData.imdb}`;
  if (omdbData?.rt) html += (html ? " | " : "") + `🍅 RT: ${omdbData.rt}`;
  if (!html && tmdbData) html = `⭐ TMDb: ${tmdbData.tmdbRating.toFixed(1)}`;

  overlay.innerHTML = html || "❌ No ratings found";

  overlay.style.display = "inline-flex";      
  overlay.style.alignItems = "center";         
  overlay.style.padding = "2px 8px";           
  overlay.style.borderRadius = "14px";        
  overlay.style.backgroundColor = "rgba(0,0,0,0.75)";
  overlay.style.color = "white";
  overlay.style.fontSize = "13px";            
  overlay.style.fontWeight = "500";
  overlay.style.width = "fit-content";         
  overlay.style.maxWidth = "max-content";      
  overlay.style.marginBottom = "6px";         
}

const observer = new MutationObserver(() => {
  const netflixTitle = getNetflixTitle();
  if (netflixTitle && netflixTitle !== lastTitle) {
    lastTitle = netflixTitle;
    console.log("🎬 New title detected:", netflixTitle);

    fetchTMDbInfo(netflixTitle).then(async tmdbData => {
      if (!tmdbData) return insertRatings(null, null);

      let omdbData = null;
      if (tmdbData.imdbId) {
        omdbData = await fetchOMDbRatings(tmdbData.imdbId);
      }

      insertRatings(tmdbData, omdbData);
    });
  }
});

observer.observe(document.body, { childList: true, subtree: true });
