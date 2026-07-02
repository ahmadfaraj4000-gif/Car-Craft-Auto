const CARCRAFT_CONVEX_URL = window.CARCRAFT_CONVEX_URL || ''

function toggleMenu() {
  const menu = document.getElementById('mobileMenu')
  const burger = document.querySelector('.hamburger')
  if (!menu) return
  const isOpen = menu.classList.toggle('open')
  if (burger) burger.setAttribute('aria-expanded', String(isOpen))
}

async function convexMutation(path, args) {
  if (!CARCRAFT_CONVEX_URL) {
    throw new Error('Convex URL is not configured. Set window.CARCRAFT_CONVEX_URL before script.js.')
  }

  const response = await fetch(`${CARCRAFT_CONVEX_URL.replace(/\/$/, '')}/api/mutation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args, format: 'json' })
  })

  const data = await response.json()
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || data.error || 'Convex request failed.')
  }
  return data.value
}

async function convexAction(path, args) {
  if (!CARCRAFT_CONVEX_URL) {
    throw new Error('Convex URL is not configured. Set window.CARCRAFT_CONVEX_URL before script.js.')
  }

  const response = await fetch(`${CARCRAFT_CONVEX_URL.replace(/\/$/, '')}/api/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args, format: 'json' })
  })

  const data = await response.json()
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || data.error || 'Convex request failed.')
  }
  return data.value
}

function initEstimateModal() {
  const form = document.getElementById('damageEstimatorForm')
  if (!form) return

  const openButtons = document.querySelectorAll('[data-estimate-open]')
  const nextBtn = document.getElementById('damageNextBtn')
  const prevBtn = document.getElementById('damagePrevBtn')
  const submitBtn = document.getElementById('damageSubmitBtn')
  const fileInput = document.getElementById('damagePhotos')
  const dropZone = document.getElementById('damageDropZone')
  const previewGrid = document.getElementById('damagePreviewGrid')
  const errorBox = document.getElementById('damageEstimatorError')
  const successBox = document.getElementById('damageEstimatorSuccess')
  const rentalNote = document.getElementById('rentalVehicleNote')
  let currentStep = 1
  let files = []

  function setError(message = '') {
    errorBox.textContent = message
    errorBox.classList.toggle('active', Boolean(message))
  }

  function setSuccess(active) {
    successBox.classList.toggle('active', Boolean(active))
  }

  function renderStep() {
    document.querySelectorAll('.damage-step').forEach((step) => {
      step.classList.toggle('active', Number(step.dataset.step) === currentStep)
    })
    document.querySelectorAll('.damage-ai-step-pill').forEach((pill) => {
      pill.classList.toggle('active', Number(pill.dataset.pill) <= currentStep)
    })
    prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible'
    nextBtn.style.display = currentStep === 4 ? 'none' : 'inline-flex'
    submitBtn.style.display = currentStep === 4 ? 'inline-flex' : 'none'
  }

  function fieldsForStep() {
    return Array.from(document.querySelectorAll(`.damage-step[data-step="${currentStep}"] input, .damage-step[data-step="${currentStep}"] select, .damage-step[data-step="${currentStep}"] textarea`))
  }

  function validateStep() {
    setError()
    for (const field of fieldsForStep()) {
      if (field.required && !String(field.value || '').trim()) {
        field.focus()
        setError('Please complete the required fields before continuing.')
        return false
      }
      if (field.type === 'email' && field.value && !field.checkValidity()) {
        field.focus()
        setError('Please enter a valid email address.')
        return false
      }
    }
    if (currentStep === 4 && files.length === 0) {
      setError('Please upload at least one clear damage photo.')
      return false
    }
    return true
  }

  function renderPreviews() {
    previewGrid.innerHTML = ''
    files.forEach((file, index) => {
      const card = document.createElement('div')
      card.className = 'damage-preview'
      const img = document.createElement('img')
      img.alt = `Vehicle damage photo ${index + 1}`
      img.src = URL.createObjectURL(file)
      img.onload = () => URL.revokeObjectURL(img.src)
      const remove = document.createElement('button')
      remove.type = 'button'
      remove.className = 'damage-remove'
      remove.textContent = '×'
      remove.addEventListener('click', () => {
        files.splice(index, 1)
        renderPreviews()
      })
      card.appendChild(img)
      card.appendChild(remove)
      previewGrid.appendChild(card)
    })
  }

  function addFiles(fileList) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    const incoming = Array.from(fileList || []).filter((file) => {
      const name = String(file.name || '').toLowerCase()
      return allowed.includes(file.type) || file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/.test(name)
    })
    files = files.concat(incoming).slice(0, 8)
    fileInput.value = ''
    renderPreviews()
  }

  async function uploadFiles() {
    const uploaded = []
    for (const [index, file] of files.entries()) {
      const uploadUrl = await convexMutation('estimateLeads:generateUploadUrl', {})
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file
      })
      if (!uploadResponse.ok) throw new Error('Photo upload failed. Please try again.')
      const { storageId } = await uploadResponse.json()
      uploaded.push({ storageId, name: file.name, order: index })
    }
    return uploaded
  }

  function getPayload(photos) {
    return {
      name: document.getElementById('damageName').value.trim(),
      phone: document.getElementById('damagePhone').value.trim(),
      email: document.getElementById('damageEmail').value.trim(),
      preferredContactMethod: document.getElementById('preferredContactMethod').value,
      vehicleYear: document.getElementById('vehicleYear').value.trim(),
      vehicleMake: document.getElementById('vehicleMake').value.trim(),
      vehicleModel: document.getElementById('vehicleModel').value.trim(),
      vin: document.getElementById('vehicleVin').value.trim().toUpperCase(),
      mileage: document.getElementById('vehicleMileage').value.trim(),
      damageArea: document.getElementById('damageArea').value.trim(),
      damageType: document.getElementById('damageType').value.trim(),
      severity: document.getElementById('damageSeverity').value,
      description: document.getElementById('damageDescription').value.trim(),
      rentalVehicleInterest: document.querySelector('input[name="rentalVehicleInterest"]:checked')?.value === 'yes',
      towAssistanceInterest: document.querySelector('input[name="towAssistanceInterest"]:checked')?.value === 'yes',
      photos
    }
  }

  function updateRentalNote() {
    const wantsRental = document.querySelector('input[name="rentalVehicleInterest"]:checked')?.value === 'yes'
    rentalNote?.classList.toggle('active', wantsRental)
  }

  openButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault()
      document.getElementById('estimate')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => document.getElementById('damageName')?.focus(), 450)
    })
  })

  nextBtn.addEventListener('click', () => {
    if (!validateStep()) return
    currentStep = Math.min(4, currentStep + 1)
    renderStep()
  })

  prevBtn.addEventListener('click', () => {
    currentStep = Math.max(1, currentStep - 1)
    renderStep()
  })

  fileInput.addEventListener('change', () => addFiles(fileInput.files))
  document.querySelectorAll('input[name="rentalVehicleInterest"]').forEach((field) => {
    field.addEventListener('change', updateRentalNote)
  })
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault()
    dropZone.classList.add('dragging')
  })
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'))
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault()
    dropZone.classList.remove('dragging')
    addFiles(event.dataTransfer.files)
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!validateStep()) return

    submitBtn.disabled = true
    submitBtn.textContent = 'Submitting...'
    setError()
    setSuccess(false)

    try {
      const photos = await uploadFiles()
      await convexAction('estimateLeads:createWithNotification', getPayload(photos))
      form.reset()
      files = []
      currentStep = 1
      renderPreviews()
      renderStep()
      setSuccess(true)
    } catch (error) {
      setError(error.message || 'Could not submit your estimate request.')
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = 'Submit Estimate'
    }
  })

  updateRentalNote()
  renderStep()
}

function initRentmectPromo() {
  const modal = document.getElementById('rentmectModal')
  if (!modal) return

  const storageKey = 'carcraftRentmectPromoSeen'
  const openButtons = document.querySelectorAll('[data-rentmect-open]')
  const closeButtons = document.querySelectorAll('[data-rentmect-close]')
  let firstVisitTimer

  function hasSeenPromo() {
    try {
      return window.localStorage.getItem(storageKey) === 'true'
    } catch (error) {
      return false
    }
  }

  function rememberPromoSeen() {
    try {
      window.localStorage.setItem(storageKey, 'true')
    } catch (error) {
      // Browsers can block localStorage in private modes. The promo still works without it.
    }
  }

  function openPromo() {
    window.clearTimeout(firstVisitTimer)
    modal.classList.add('active')
    modal.setAttribute('aria-hidden', 'false')
    document.body.style.overflow = 'hidden'
  }

  function closePromo() {
    modal.classList.remove('active')
    modal.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = ''
    rememberPromoSeen()
  }

  openButtons.forEach((button) => {
    button.addEventListener('click', openPromo)
  })

  closeButtons.forEach((button) => {
    button.addEventListener('click', closePromo)
  })

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closePromo()
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('active')) {
      closePromo()
    }
  })

  if (!hasSeenPromo()) {
    firstVisitTimer = window.setTimeout(openPromo, 1200)
  }
}

function initCookieConsent() {
  const banner = document.getElementById('cookieConsentBanner')
  if (!banner) return

  const storageKey = 'carcraftCookieConsent'
  const acceptButtons = document.querySelectorAll('[data-cookie-accept]')
  const denyButtons = document.querySelectorAll('[data-cookie-deny]')
  const preferenceButtons = document.querySelectorAll('[data-cookie-preferences]')

  function getChoice() {
    try {
      return window.localStorage.getItem(storageKey)
    } catch (error) {
      return null
    }
  }

  function setChoice(choice) {
    try {
      window.localStorage.setItem(storageKey, choice)
    } catch (error) {
      // Consent still works for the current page view if storage is unavailable.
    }
    banner.classList.remove('active')
    banner.setAttribute('aria-hidden', 'true')
  }

  function openBanner() {
    banner.classList.add('active')
    banner.setAttribute('aria-hidden', 'false')
  }

  if (!getChoice()) openBanner()

  acceptButtons.forEach((button) => {
    button.addEventListener('click', () => setChoice('accepted'))
  })

  denyButtons.forEach((button) => {
    button.addEventListener('click', () => setChoice('denied'))
  })

  preferenceButtons.forEach((button) => {
    button.addEventListener('click', openBanner)
  })
}

document.addEventListener('DOMContentLoaded', initEstimateModal)
document.addEventListener('DOMContentLoaded', initRentmectPromo)
document.addEventListener('DOMContentLoaded', initCookieConsent)
