// LOAD DATA

// property test data 

let allProperties = [];
let currentFilter = "all";


/// <summary>
/// Fetch property data from session storage and filter by status
/// </summary>
async function getPropertyData(filter){
  let currentFilter = filter || "all";
  try {
    const raw = sessionStorage.getItem("PROPERTY_DATA");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    allProperties = Array.isArray(parsed) ? parsed : [];
    const cf = String(currentFilter).toLowerCase();
    return allProperties.filter((x) => {
      const val = x && x.RESIDENTIAL;
      let isResidential = String(val).toLowerCase() === "true";
      if (!isResidential) return false;                     // always require commercial
      const status = String(x.STATUS || "").toLowerCase();
      if (cf === "all") return true;                      // all commercial items
      return status === cf;  
    });
  } catch (err) {
    console.error("getPropertyData error:", err);
    allProperties = [];
    return [];
  }
}



async function filterProperties(filter){
  currentFilter = filter;
  renderProperties(currentFilter);
}


/// <summary>
/// Create a property card HTML representation
/// </summary>
function createPropertyCard(property) {
  const imgSrc = (Array.isArray(property.IMAGENAMES) && property.IMAGENAMES[0]) ? property.IMAGENAMES[0] : '/assets/img/placeholder.png';
  // const title = property.TITLE || '';
  const price = property.PRICE || '';
  const details = property.DETAILS || '';
  const id = property.ID != null ? property.ID : '';
  const status = property.STATUS || '';

  // Determine badge text and color class
  let badgeText = '';
  let badgeClass = '';

  const TITLE = getPropertyTitle(property);

  switch (status) {
    case 'open':
      badgeText = 'Available';
      badgeClass = 'status-open';
      break;
    case 'closed':
      badgeText = 'Unavailable';
      badgeClass = 'status-closed';
      break;
    case 'soon':
      badgeText = 'Available Soon';
      badgeClass = 'status-soon';
      break;
    default:
      badgeText = '';
      badgeClass = '';
  }

  return `
    <div class="property-card" data-status="${status}" data-id="${id}">
      <img src="${imgSrc}" alt="${TITLE}" class="property-image" />
      <div class="card-body">
        ${badgeText ? `<span class="status-badge ${badgeClass}">${badgeText}</span>` : ''}
        <h3 class="property-title">${TITLE}</h3>
        <p class="property-price">${price}</p>
        <p class="property-details">${details}</p>
        <a class="property-link">View Details</a>
      </div>
    </div>
  `;
}


function getPropertyTitle(property) {
  const isResidential = String(property.RESIDENTIAL || '').toLowerCase() === 'true';
  const isCommercial = String(property.COMMERCIAL || '').toLowerCase() === 'true';
  const propertyAltTitle = isResidential && isCommercial
    ? 'Residential & Commercial'
    : isResidential
      ? 'Residential'
      : isCommercial
        ? 'Commercial'
        : '';
  // prefer a non-empty trimmed TITLE, fall back to generated alt title, then "Property"
  const rawTitle = property.TITLE || '';
  const TITLE = rawTitle.trim() || propertyAltTitle || 'Property';
  return TITLE;
}

/// <summary>
/// Render properties based on the provided filter
/// </summary>
async function renderProperties(filter) {
  const resedential = await getPropertyData(filter);
  const container = document.getElementById("resedential-list");
  container.innerHTML = resedential.map(createPropertyCard).join("");
  container.removeEventListener("click", cardClickHandler);
  container.addEventListener("click", cardClickHandler);
}

let modal, closeBtn, imgEl, counterEl, titleEl, priceEl, locationEl, descEl
let slideshowInterval = null;

/// <summary>
/// Initialize modal elements
/// </summary>
function initElements(){
   modal = document.getElementById("property-modal");
   closeBtn = document.querySelector(".close-btn");
   imgEl = document.getElementById("property-image");
   counterEl = document.getElementById("image-counter");
   titleEl = document.getElementById("property-title");
   priceEl = document.getElementById("property-price");
   locationEl = document.getElementById("property-location");
   descEl = document.getElementById("property-description");
   availabilityBadge = document.getElementById("availability-badge");
   detailsEl = document.getElementById("property-details-modal");
   thumbnailStrip = document.getElementById("thumbnail-strip");
}

let currentIndex = 0;

/// <summary>
/// Open modal with property details
/// </summary>
function openPropertyModal(property) {
  if (!modal) return;
  titleEl && (titleEl.textContent = property.TITLE || '');
  priceEl && (priceEl.textContent = property.PRICE || '');
  locationEl && (locationEl.textContent = property.LOCATION || '');
  descEl && (descEl.textContent = property.DESCRIPTION || '');  
  detailsEl && (detailsEl.textContent = property.DETAILS || '');
  const images = Array.isArray(property.IMAGENAMES) ? property.IMAGENAMES : [];
  currentIndex = 0;
  
  renderThumbnails(images);
  updateImage(images);

  modal.style.display = "block";


  // Start slideshow (change every 3 seconds)
  // startSlideshow(images);
  document.getElementById("prev-img").onclick = () => {stopSlideshow(); changeImage(images, -1)};
  document.getElementById("next-img").onclick = () => {stopSlideshow(); changeImage(images, 1)};
}

function renderThumbnails(images) {
  if (!thumbnailStrip) return;

  thumbnailStrip.innerHTML = '';

  if (!images || images.length === 0) return;

  images.forEach((img, index) => {
    const thumb = document.createElement('img');
    thumb.src = img;
    thumb.dataset.index = index;

    if (index === currentIndex) {
      thumb.classList.add('active');
    }

    thumbnailStrip.appendChild(thumb);
  });
}

function startSlideshow(images) {
  stopSlideshow(); // Clear if already running
  slideshowInterval = setInterval(() => {
    changeImage(images, 1); // Next image
     if (currentIndex === 0) {
      stopSlideshow();
    }
  }, 2000); // 3 seconds — adjust as desired
}

function stopSlideshow() {
  if (slideshowInterval) {
    clearInterval(slideshowInterval);
    slideshowInterval = null;
  }
}


/// <summary>
/// Update the displayed image and counter in the modal
/// </summary>
function updateImage(images) {
  if (!imgEl || !counterEl) return;
  if (!images || images.length === 0) {
    imgEl.src = 'assets/img/placeholder.png';
    // counterEl.textContent = `0 / 0`;
    return;
  }
  // clamp currentIndex
  currentIndex = Math.max(0, Math.min(currentIndex, images.length - 1));
  imgEl.src = images[currentIndex] || 'assets/img/placeholder.png';
  // counterEl.textContent = `${currentIndex + 1} / ${images.length}`;
  
  const thumbs = thumbnailStrip?.querySelectorAll('img');
  if (thumbs && thumbs.length) {
    thumbs.forEach(t => t.classList.remove('active'));
    thumbs[currentIndex].classList.add('active')
  }
}

function changeImage(images, step) {
  if (!images || images.length === 0) return;
  currentIndex = (currentIndex + step + images.length) % images.length;
  updateImage(images);
}


/// <summary>
/// Set up filter buttons for property status
/// </summary>
function setupFilters() {
  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const status = (btn.dataset.status || "all").toLowerCase();
      buttons.forEach(b => b.classList.toggle("active", (b.dataset.status || "").toLowerCase() === status));
      filterProperties(status);
    });
  });
}


/// <summary>
/// Load the modal content
/// </summary>
async function loadModal(){
  try {
    const modalHTML = await fetch('partials/property-details-card.html').then(res => res.text());
    const placeholder = document.getElementById('property-details');
    if (placeholder) placeholder.innerHTML = modalHTML;    
  } catch (err) {
    console.error("loadModal failed:", err);
  }
}

function cardClickHandler(e) {
  const card = e.target.closest(".property-card");
  if (!card) return;
  const idAttr = card.getAttribute("data-id");
  const property = allProperties.find((p) => String(p.ID) === String(idAttr));
  if (property) {
    openPropertyModal(property);
  }
}


async function initializeModal(){
  await loadModal().then(()=>{
    initElements();
    if (closeBtn && modal) {
      closeBtn.onclick = () => {
        stopSlideshow();
        modal.style.display = "none"
      };
    } else {
      console.warn("Modal or close button not found yet");
    }

    // Optional: close if clicking outside
    window.onclick = (e) => {
      if (modal && e.target == modal) {
        stopSlideshow();
        modal.style.display = "none";
      }
    };
  });
}

async function initializeThumbnailsStrip(){
  thumbnailStrip?.addEventListener('click', function (e) {
      if (e.target.tagName === 'IMG') {
        stopSlideshow();
        currentIndex = parseInt(e.target.dataset.index);
        updateImage(
          Array.from(thumbnailStrip.querySelectorAll('img')).map(i => i.src)
        );
      }
    });
}

/// Initialize filters and render properties

function waitForPropertyData(interval = 700) {
  return new Promise(resolve => {
    const check = setInterval(() => {
      console.log("checking for property data...")
      if (sessionStorage.getItem("PROPERTY_DATA")) {
        clearInterval(check);
        resolve();
      }
    }, interval);
  });
}


async function runResidential(){
  if(!sessionStorage.getItem("PROPERTY_DATA")){
    await waitForPropertyData();
  }
  setupFilters();
  renderProperties(currentFilter).catch((err) => console.error("renderProperties failed:", err));
}

async function run(){
  await runResidential();
  await initializeModal();
  initializeThumbnailsStrip()
  const params = new URLSearchParams(window.location.search || '');
  const selectedId = params.get('id');
  if (selectedId) {
    const card = document.querySelector(`.property-card[data-id="${selectedId}"]`);
    if (card) {
      cardClickHandler({target: card});
    }
  }
}


run();