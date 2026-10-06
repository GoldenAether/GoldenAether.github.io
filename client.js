/ ===== Connection and global state =====
var harmonyVer = "1.0.0"

const wsUri = "ws://74.197.196.228:8080/";
const output = document.getElementById("output");
const titleElement = document.getElementById("title");
let websocket;
let reconnectTimer = 0
const pendingMessages = []
const optimisticMessages = []
const commandMessages = new Set()
const pendingDelivery = new Map()
const sendFailureTimeout = 10000

const notifBanner = document.getElementById("notifBanner")
const missedButton = document.getElementById("missedButton")
const composerMissedButton = document.getElementById("composerMissedButton")
function scrollToNewest() {
  output?.scroll({ top: output.scrollHeight, left: 0, behavior: "smooth" })
  unreads = 0
  updateMissedMessages()
  if (titleElement) titleElement.innerText = clientName
}
if (missedButton) missedButton.addEventListener("click", scrollToNewest)
if (composerMissedButton) composerMissedButton.addEventListener("click", scrollToNewest)

var clientName = "Altraia"

var unreads = 0

function updateMissedMessages() {
  const button = document.getElementById("missedButton")
  const title = unreads ? `${unreads} missed messages` : "No missed messages"

  if (button) {
    button.textContent = unreads
    button.dataset.empty = String(unreads === 0)
    button.title = title
    button.setAttribute("aria-label", title)
  }

  // The composer counter is the visible missed-message control.
  if (composerMissedButton) {
    composerMissedButton.textContent = unreads
    composerMissedButton.hidden = false
    composerMissedButton.setAttribute("aria-disabled", String(unreads === 0))
    composerMissedButton.title = title
    document.querySelector(".msgBar")?.classList.toggle("has-missed", unreads > 0)
  }
}

updateMissedMessages()

function normalizeAccountName(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_") || "guest"
}

function getLastUsername() {
  const cookieUsername = getCookie("usrnam")
  if (cookieUsername) return cookieUsername
  try { return window.localStorage.getItem("cosmos:lastUsername") || "" }
  catch (error) { return "" }
}

var username = getLastUsername()

// All persisted data is namespaced by the signed-in username. This keeps one
// device's profiles, settings, friends, and picture separate between accounts.
function accountStorageKey(key, accountName = username) {
  return `cosmos:${normalizeAccountName(accountName)}:${key}`
}
const accountStorage = {
  getItem: key => {
    try { return window.localStorage.getItem(accountStorageKey(key)) }
    catch (error) { console.warn("Saved data could not be read.", error); return null }
  },
  setItem: (key, value) => {
    try { window.localStorage.setItem(accountStorageKey(key), String(value)); return true }
    catch (error) { console.warn("Saved data could not be written.", error); return false }
  },
  removeItem: key => {
    try { window.localStorage.removeItem(accountStorageKey(key)); return true }
    catch (error) { console.warn("Saved data could not be removed.", error); return false }
  }
}

function loadAccountData() {
  try {
    pfpData = accountStorage.getItem("pfp") || ""
    bioText = accountStorage.getItem("bio") || ""
    statusText = accountStorage.getItem("status") || ""
    spotifyUrl = accountStorage.getItem("spotify") || ""
    friends.clear()
    JSON.parse(accountStorage.getItem("friends") || "[]").forEach(friend => friends.set(friend.username, friend))
  } catch (error) {
    console.warn("Saved account data is unavailable.", error)
  }
}

var pfpData = ""
var bioText = ""
var statusText = ""
var spotifyUrl = ""
var profileOwner = ""
var confettiColors = []
var particleShape = "circles"
var effectDuration = 3
var effectIntensity = 100
var effectsDisabled = false
var screenShake = false
let fpsAnimationFrame = 0
let fpsLastTime = performance.now()
let fpsFrames = 0

function setFpsVisibility(visible) {
  const counter = document.getElementById("fpsCounter")
  if (!counter) return
  counter.hidden = !visible
  if (visible && !fpsAnimationFrame) fpsAnimationFrame = requestAnimationFrame(updateFps)
}

function updateFps(time) {
  fpsFrames += 1
  if (time - fpsLastTime >= 500) {
    const counter = document.getElementById("fpsCounter")
    if (counter) counter.textContent = `FPS: ${Math.round(fpsFrames * 1000 / (time - fpsLastTime))}`
    fpsFrames = 0
    fpsLastTime = time
  }
  const counter = document.getElementById("fpsCounter")
  fpsAnimationFrame = counter && !counter.hidden ? requestAnimationFrame(updateFps) : 0
}
try {
  localStorage.removeItem("cosmosReactions")
  localStorage.removeItem("cosmosReactionSettings")
  localStorage.removeItem("cosmosDensity")
  localStorage.removeItem("cosmosClockFormat")
  localStorage.removeItem("cosmosTimestamps")
  localStorage.removeItem("cosmosTypingIndicators")
  localStorage.removeItem("cosmosReadReceipts")
  localStorage.removeItem("cosmosOnlineStatus")
  localStorage.removeItem("cosmosInvisibleMode")
} catch (error) {
  console.warn("Old reaction preferences could not be cleared.", error)
}
try {
  bioText = accountStorage.getItem("bio") || ""
  statusText = accountStorage.getItem("status") || ""
  spotifyUrl = accountStorage.getItem("spotify") || ""
} catch (error) {
  console.warn("Saved bio is unavailable.", error)
}
try {
  pfpData = accountStorage.getItem("pfp") || ""
} catch (error) {
  console.warn("Saved profile data is unavailable.", error)
}

// ===== Theme definitions and theme application =====
const themes = [
  ["Day (Default)", "#451700", "#F07A18", "#F5E38B"],
  ["Night", "#2A0F3B", "#7F5AF0", "#B46FDF"],
  ["Sunrise", "#001342", "#E34735", "#FDBF8E"],
  ["Sunset", "#460000", "#5F3EFF", "#92B5F7"],
  ["Red", "#A80000", "#D30363", "#F5F5F5"],
  ["Iridescent", "#460400", "#FF2D92", "#A9A0EA"],
  ["Orange", "#470000", "#F44D24", "#FEAB95"],
  ["Green", "#470000", "#00FFF2", "#84F497"],
  ["Blue", "#001A43", "#00709B", "#7CD9F5"],
  ["Coming Soon", "#451700", "#F07A18", "#F5E38B"]
]

let activeThemeColors = themes[0].slice(1)
let activeBackgroundColors = activeThemeColors
let activeLineColors = activeThemeColors
let displayedThemeColors = activeThemeColors.slice()
let displayedBackgroundColors = activeBackgroundColors.slice()
let displayedLineColors = activeLineColors.slice()
let themeAnimationFrame = 0
let selectedThemeIndex = 0
const friends = new Map()
try {
  JSON.parse(accountStorage.getItem("friends") || "[]").forEach(friend => friends.set(friend.username, friend))
} catch (error) {
  console.warn("Saved friends are unavailable.", error)
}

function saveFriends() {
  try {
    accountStorage.setItem("friends", JSON.stringify([...friends.values()]))
  } catch (error) {
    console.warn("Friends could not be saved.", error)
  }
}

// Profile data is carried over the existing chat connection so friends do not
// need to remove and re-add someone to see their latest status or bio.
// The server drops empty messages, so use an invisible non-empty character.
// The flags below ensure this packet is consumed without becoming a chat bubble.
const profileUpdateMessage = "\u2063"

function getProfilePacket(message = profileUpdateMessage) {
  return {
    message,
    username,
    pfp: pfpData,
    bio: bioText,
    status: statusText,
    spotify: spotifyUrl,
    profileUpdate: true,
    type: "profile-update"
  }
}

function broadcastProfileUpdate() {
  if (!username) return
  const packet = JSON.stringify(getProfilePacket())

  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    if (!websocket || websocket.readyState === WebSocket.CLOSED) connectToChat()
    pendingMessages.push(packet)
    return
  }

  try {
    websocket.send(packet)
  } catch (error) {
    console.warn("Profile update could not be sent.", error)
  }
}

function updateFriendProfile(profile) {
  if (!profile?.username || profile.username === username || !friends.has(profile.username)) return
  const friend = friends.get(profile.username)
  let changed = false
  ;["pfp", "bio", "status", "spotify"].forEach(key => {
    if (profile[key] !== undefined && friend[key] !== profile[key]) {
      friend[key] = profile[key]
      changed = true
    }
  })
  if (!changed) return
  saveFriends()
  renderFriends()
  if (profileOwner === profile.username) showFriendBio(friend)
}

function renderFriends() {
  const list = document.getElementById("friendsList")
  const empty = document.getElementById("friendsEmpty")
  if (!list || !empty) return
  list.replaceChildren()
  empty.hidden = friends.size > 0
  friends.forEach(friend => {
    const entry = document.createElement("div")
    entry.className = "friend-entry"
    entry.title = `View ${friend.username}'s bio`
    entry.addEventListener("click", () => showFriendBio(friend))

    const image = document.createElement("img")
    image.src = friend.pfp
    image.alt = `${friend.username}'s profile picture`
    image.title = `Remove ${friend.username}`
    image.addEventListener("click", event => {
      event.preventDefault()
      event.stopPropagation()
      friends.delete(friend.username)
      saveFriends()
      document.querySelectorAll(".message .pfp").forEach(profileImage => {
        const isFriend = friends.has(profileImage.dataset.username)
        profileImage.classList.toggle("is-friend", isFriend)
        profileImage.title = isFriend ? "Unfriend" : "Add friend"
      })
      renderFriends()
    })

    const details = document.createElement("div")
    details.className = "friend-details"

    const name = document.createElement("strong")
    name.className = "friend-name"
    name.textContent = friend.username

    const status = document.createElement("span")
    status.className = "friend-status"
    status.textContent = friend.status || "No status"

    details.append(name, status)
    entry.append(image, details)
    list.appendChild(entry)
  })
}

function showFriendBio(friend) {
  const panel = document.getElementById("bioPanel")
  if (!friend?.username) return
  if (!panel) return
  panel.querySelector("h2").textContent = `${friend.username}'s Bio`
  const profilePicture = document.getElementById("bioProfilePicture")
  if (profilePicture) {
    profilePicture.src = friend.pfp || "./assets/Cosmos-Logo.png"
    profilePicture.alt = `${friend.username}'s profile picture`
  }
  const editor = document.getElementById("bioInput")
  const statusEditor = document.getElementById("statusInput")
  const spotifyEditor = document.getElementById("spotifyInput")
  const notesEditor = document.getElementById("notesInput")
  const saveButton = document.getElementById("saveBioButton")
  const openSpotifyButton = document.getElementById("openSpotifyButton")
  const notesLabel = document.getElementById("notesLabel")
  const status = document.getElementById("bioStatus")
  const title = document.getElementById("bioTitle")
  const statusPreview = document.getElementById("profileStatusPreview")
  const spotifyPreview = document.getElementById("spotifyPreview")
  const isSelf = friend.username === username
  const isFriend = friends.has(friend.username)
  profileOwner = friend.username
  const spotify = isSelf ? spotifyUrl : (friend.spotify || "")
  if (title) title.textContent = `${friend.username}'s Profile`
  if (editor) { editor.value = isSelf ? bioText : (friend.bio || "No bio yet."); editor.readOnly = !isSelf }
  if (statusEditor) { statusEditor.value = isSelf ? statusText : (friend.status || ""); statusEditor.readOnly = !isSelf }
  if (spotifyEditor) { spotifyEditor.value = spotify; spotifyEditor.readOnly = !isSelf }
  if (notesEditor) { notesEditor.value = isFriend && !isSelf ? (friend.notes || "") : ""; notesEditor.readOnly = !isFriend || isSelf; notesEditor.hidden = !isFriend || isSelf }
  if (notesLabel) notesLabel.hidden = !isFriend || isSelf
  if (statusPreview) statusPreview.textContent = isSelf ? statusText : (friend.status || "")
  if (spotifyPreview) spotifyPreview.textContent = spotify ? "Spotify connected" : ""
  if (openSpotifyButton) { openSpotifyButton.hidden = !spotify; openSpotifyButton.onclick = () => window.open(spotify, "_blank", "noopener") }
  if (saveButton) saveButton.hidden = !isSelf
  if (status) status.textContent = ""
  document.getElementById("sidebar")?.classList.add("themes-open")
  document.getElementById("themeButton")?.setAttribute("aria-expanded", "true")
  document.querySelectorAll(".panel-tab").forEach(tab => {
    const selected = tab.dataset.panel === "bioPanel"
    tab.classList.toggle("active", selected)
    tab.setAttribute("aria-selected", String(selected))
  })
  document.querySelectorAll(".sidebar-panel").forEach(item => {
    item.hidden = item.id !== "bioPanel"
    item.classList.toggle("active", !item.hidden)
  })
}

function toggleFriend(profile) {
  if (!profile.username || profile.username === username) return
  const wasFriend = friends.has(profile.username)
  if (wasFriend) friends.delete(profile.username)
  else friends.set(profile.username, profile)
  saveFriends()
  document.querySelectorAll(".message .pfp").forEach(image => {
    image.classList.toggle("is-friend", friends.has(image.dataset.username))
    image.title = friends.has(image.dataset.username) ? "Unfriend" : "Add friend"
  })
  renderFriends()
}

function setupBio() {
  const editor = document.getElementById("bioInput")
  const saveButton = document.getElementById("saveBioButton")
  if (!editor || !saveButton) return
  const statusEditor = document.getElementById("statusInput")
  const spotifyEditor = document.getElementById("spotifyInput")
  const notesEditor = document.getElementById("notesInput")
  editor.value = bioText
  if (statusEditor) statusEditor.value = statusText
  if (spotifyEditor) spotifyEditor.value = spotifyUrl
  saveButton.addEventListener("click", () => {
    if (profileOwner && profileOwner !== username) return
    bioText = editor.value.trim()
    statusText = statusEditor?.value.trim() || ""
    spotifyUrl = spotifyEditor?.value.trim() || ""
    try {
      accountStorage.setItem("bio", bioText)
      accountStorage.setItem("status", statusText)
      accountStorage.setItem("spotify", spotifyUrl)
    } catch (error) {
      console.warn("Profile could not be saved.", error)
    }
    const preview = document.getElementById("profileStatusPreview")
    if (preview) preview.textContent = statusText
    document.getElementById("bioStatus").textContent = "Profile saved"
    broadcastProfileUpdate()
  })
  document.getElementById("notesInput")?.addEventListener("input", event => {
    const friend = friends.get(profileOwner)
    if (!friend || profileOwner === username) return
    friend.notes = event.target.value
    saveFriends()
  })
}

function setupSidebarTabs() {
  document.querySelectorAll(".panel-tab").forEach(tab => tab.addEventListener("click", () => {
    if (tab.dataset.panel === "bioPanel") showFriendBio({ username, pfp: pfpData, bio: bioText, status: statusText, spotify: spotifyUrl })
    document.querySelectorAll(".panel-tab").forEach(item => {
      const selected = item === tab
      item.classList.toggle("active", selected)
      item.setAttribute("aria-selected", String(selected))
    })
    document.querySelectorAll(".sidebar-panel").forEach(panel => {
      panel.hidden = panel.id !== tab.dataset.panel
      panel.classList.toggle("active", !panel.hidden)
    })
    document.getElementById("sidebar")?.classList.add("themes-open")
    document.getElementById("themeButton")?.setAttribute("aria-expanded", "true")
  }))
  renderFriends()
}


let darkMode = false
let silentMode = false
let confettiOnJoins = false
try {
  darkMode = accountStorage.getItem("DarkMode") === "true"
  silentMode = accountStorage.getItem("SilentMode") === "true"
  // Confetti is opt-in; missing preferences stay disabled.
  confettiOnJoins = accountStorage.getItem("Confetti") === "true"
} catch (error) {
  console.warn("Saved settings are unavailable.", error)
}

function darkenColor(hex, amount) {
  const value = hex.replace("#", "")
  const red = parseInt(value.slice(0, 2), 16)
  const green = parseInt(value.slice(2, 4), 16)
  const blue = parseInt(value.slice(4, 6), 16)
  const shade = channel => Math.round(channel * (1 - amount)).toString(16).padStart(2, "0")
  return `#${shade(red)}${shade(green)}${shade(blue)}`
}

function colorToRgb(color) {
  const value = color.replace("#", "")
  return [0, 1, 2].map(channel => parseInt(value.slice(channel * 2, channel * 2 + 2), 16))
}

function rgbToHex(rgb) {
  return `#${rgb.map(channel => Math.round(channel).toString(16).padStart(2, "0")).join("")}`
}

function interpolateColors(from, to, progress) {
  return from.map((color, index) => {
    const start = colorToRgb(color)
    const end = colorToRgb(to[index])
    return rgbToHex(start.map((channel, component) => channel + (end[component] - channel) * progress))
  })
}

function animateThemeColors(targetColors, targetBackgroundColors, targetLineColors) {
  cancelAnimationFrame(themeAnimationFrame)
  const startColors = displayedThemeColors.slice()
  const startBackground = displayedBackgroundColors.slice()
  const startTime = performance.now()
  const duration = 500

  const step = now => {
    const progress = Math.min(1, (now - startTime) / duration)
    const eased = progress < .5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
    displayedThemeColors = interpolateColors(startColors, targetColors, eased)
    displayedBackgroundColors = interpolateColors(startBackground, targetBackgroundColors, eased)
    activeThemeColors = displayedThemeColors
    activeBackgroundColors = displayedBackgroundColors
    displayedLineColors = interpolateColors(displayedLineColors, targetLineColors, eased)
    activeLineColors = displayedLineColors
    drawWater()
    if (progress < 1) themeAnimationFrame = requestAnimationFrame(step)
    else {
      displayedThemeColors = targetColors.slice()
      displayedBackgroundColors = targetBackgroundColors.slice()
      activeThemeColors = displayedThemeColors
      activeBackgroundColors = displayedBackgroundColors
      activeLineColors = targetLineColors.slice()
      drawWater()
    }
  }
  themeAnimationFrame = requestAnimationFrame(step)
}

function clearCustomThemeBackground() {
  document.documentElement.style.removeProperty("--custom-background-image")
  document.documentElement.classList.remove("has-custom-background")
  document.body?.style.removeProperty("background-image")
  if (waterCanvas) waterCanvas.style.opacity = ""
}

function applyCustomTheme(colors, backgroundImage = "", options = {}) {
  const themeColors = colors.slice(0, 3)
  if (themeColors.length !== 3) return
  selectedThemeIndex = -1
  animateThemeColors(themeColors, themeColors, themeColors)
  const root = document.documentElement
  root.style.setProperty("--bg", themeColors[0])
  root.style.setProperty("--accent", themeColors[1])
  root.style.setProperty("--highlight", themeColors[2])
  root.style.setProperty("--shadow", `${themeColors[2]}80`)
  root.style.setProperty("--surface", `color-mix(in srgb, ${themeColors[0]} 84%, ${themeColors[1]})`)
  root.style.setProperty("--surface-border", `color-mix(in srgb, ${themeColors[2]} 55%, ${themeColors[1]})`)
  root.classList.add("has-custom-theme")
  if (backgroundImage) {
    root.style.setProperty("--custom-background-image", `url(${JSON.stringify(backgroundImage)})`)
    root.classList.add("has-custom-background")
    document.body?.style.setProperty("background-image", `url(${JSON.stringify(backgroundImage)})`)
    if (waterCanvas) waterCanvas.style.opacity = ".38"
  } else {
    clearCustomThemeBackground()
  }
  document.querySelectorAll(".theme-choice").forEach(button => button.classList.remove("active"))
  if (options.persist !== false) {
    accountStorage.setItem("CustomTheme", JSON.stringify({ colors: themeColors, backgroundImage }))
    accountStorage.removeItem("Theme")
  }
  drawWater()
}

function restoreCustomTheme() {
  try {
    const saved = JSON.parse(accountStorage.getItem("CustomTheme") || "null")
    if (saved?.colors?.length === 3) applyCustomTheme(saved.colors, saved.backgroundImage || "", { persist: false })
  } catch (error) {
    console.warn("Custom theme could not be restored.", error)
  }
}

function applyTheme(index, options = {}) {
  clearCustomThemeBackground()
  document.documentElement.classList.remove("has-custom-theme")
  const themeIndex = Math.max(0, Math.min(index, themes.length - 1))
  const shouldPersist = options.persist !== false
  if (shouldPersist) selectedThemeIndex = themeIndex
  const theme = themes[themeIndex] || themes[0]
  const themeColors = darkMode
    ? [darkenColor(theme[1], .35), darkenColor(theme[2], .2), theme[3]]
    : theme.slice(1)
  const targetBackgroundColors = darkMode ? ["#1e1e1e", "#252526", "#2d2d30"] : themeColors
  const targetLineColors = darkMode ? theme.slice(1) : themeColors
  animateThemeColors(themeColors, targetBackgroundColors, targetLineColors)
  // Keep the complete interface on the same three theme colors.
  const root = document.documentElement
  root.classList.add("theme-transition")
  clearTimeout(applyTheme.transitionTimer)
  applyTheme.transitionTimer = setTimeout(() => root.classList.remove("theme-transition"), 550)
  root.style.setProperty("--bg", themeColors[0])
  root.style.setProperty("--accent", themeColors[1])
  root.style.setProperty("--highlight", themeColors[2])
  root.style.setProperty("--shadow", `${theme[2]}80`)
  // Shared surface color used by the theme panel and other floating controls.
  root.style.setProperty("--surface", `color-mix(in srgb, ${theme[1]} 84%, ${theme[2]})`)
  root.style.setProperty("--surface-border", `color-mix(in srgb, ${theme[3]} 55%, ${theme[2]})`)
  updateThemeAssets(theme[0])
  if (shouldPersist) {
    try {
      accountStorage.setItem("Theme", String(selectedThemeIndex))
    } catch (error) {
      console.warn("Theme preference could not be saved.", error)
    }
  }
  document.querySelectorAll(".theme-choice").forEach((button, i) => button.classList.toggle("active", i === selectedThemeIndex))
  updateThemePreviews()
}

function updateThemePreviews() {
  document.querySelectorAll(".theme-choice").forEach((button, index) => {
    const canvas = button.querySelector("canvas")
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return
    const theme = themes[index]
    const background = darkMode ? ["#1e1e1e", "#252526", "#2d2d30"] : theme.slice(1)
    drawLiquid(context, canvas.width, canvas.height, background, 0, 0, theme.slice(1))
  })
}

function updateThemeAssets(themeName) {
  const themeFolders = {
    "Day (Default)": "day",
    Night: "night",
    Sunrise: "sunrise",
    Sunset: "sunset",
    Red: "red",
    Iridescent: "iridescent",
    Orange: "orange",
    Green: "green",
    Blue: "blue"
  }
  const folder = themeFolders[themeName] || "day"
  const root = document.documentElement
  const modeFolder = darkMode ? "dark" : "light"
  const iconPath = `./assets/${modeFolder}/${folder}/`
  root.style.setProperty("--button-asset-path", iconPath)
  root.style.setProperty("--cursor-asset-path", `./assets/cursors/${folder}/`)
  root.style.setProperty("--theme-cursor", `url('./assets/cursors/${folder}/normal.cur'), url('./assets/cursors/${folder}/normal.png'), url('./assets/cursors/normal.cur'), url('./assets/cursors/normal.png'), auto`)
  root.dataset.theme = folder
  root.dataset.themeMode = modeFolder
  root.classList.toggle("dark-mode", darkMode)

  // Theme artwork is optional: each image falls back to its original asset if
  // the matching light/dark themed file has not been added yet.
  document.querySelectorAll("[data-theme-asset]").forEach(asset => {
    const isLink = asset.tagName === "LINK"
    const attribute = isLink ? "href" : "src"
    if (!asset.dataset.defaultSrc) asset.dataset.defaultSrc = asset.getAttribute(attribute)
    const fileName = asset.dataset.themeAsset
    asset.onerror = () => {
      asset.onerror = null
      asset.setAttribute(attribute, asset.dataset.defaultSrc)
    }
    asset.setAttribute(attribute, iconPath + fileName)
  })

  // The profile picture and send arrow are not part of the themed icon set.
  updatePfpPreview()
}

function reloadAccountSettings() {
  const readBoolean = (key, fallback = false) => {
    const saved = accountStorage.getItem(key)
    return saved === null ? fallback : saved === "true"
  }

  // Remove the retired glass option from older saved accounts.
  accountStorage.removeItem("GlassMode")
  darkMode = readBoolean("DarkMode")
  silentMode = readBoolean("SilentMode")
  confettiOnJoins = readBoolean("Confetti")

  const savedTheme = Number(accountStorage.getItem("Theme")) || 0
  applyTheme(savedTheme, { persist: false })
  restoreCustomTheme()

  const checkboxSettings = [
    ["darkModeToggle", darkMode],
    ["silentModeToggle", silentMode],
    ["confettiToggle", confettiOnJoins],
    ["mentionConfettiToggle", readBoolean("MentionConfetti")],
    ["screenShakeToggle", readBoolean("ScreenShake")],
    ["disableEffectsToggle", readBoolean("DisableEffects")],
    ["showFpsToggle", readBoolean("ShowFps")],
    ["touchscreenModeToggle", readBoolean("Touchscreen")],
    ["animatedBackgroundToggle", readBoolean("AnimatedBackground", true)],
    ["disableBlurToggle", readBoolean("DisableBlur")],
    ["reducedMotionToggle", readBoolean("ReducedMotion")],
    ["compactModeToggle", readBoolean("CompactMode")],
    ["mentionOnlyToggle", readBoolean("MentionOnly")],
    ["notificationPreviewToggle", readBoolean("NotificationPreview", true)],
    ["autoScrollToggle", readBoolean("AutoScroll", true)],
    ["highContrastToggle", readBoolean("HighContrast")],
    ["largeTextToggle", readBoolean("LargeText")]
  ]

  checkboxSettings.forEach(([id, checked]) => {
    const control = document.getElementById(id)
    if (control) control.checked = checked
  })
  effectsDisabled = readBoolean("DisableEffects")
  screenShake = readBoolean("ScreenShake")
  particleShape = accountStorage.getItem("ParticleShape") || "circles"
  effectDuration = Number(accountStorage.getItem("EffectDuration") || 3)
  effectIntensity = Number(accountStorage.getItem("EffectIntensity") || 100)
  confettiColors = (accountStorage.getItem("ConfettiColors") || "").split(",").map(value => value.trim()).filter(Boolean)
  backgroundPaused = !readBoolean("AnimatedBackground", true)
  document.documentElement.classList.toggle("disable-blur", readBoolean("DisableBlur"))
  document.documentElement.classList.toggle("high-contrast", readBoolean("HighContrast"))
  document.documentElement.classList.toggle("large-text", readBoolean("LargeText"))
  // Migrate the old rounded name to the new user-facing default label.
  const savedBubbleStyle = accountStorage.getItem("BubbleStyle")
  const bubbleStyle = ["rounded", "cloud"].includes(savedBubbleStyle) ? "default" : (savedBubbleStyle || "default")
  document.documentElement.dataset.bubbleStyle = bubbleStyle
  if (["rounded", "cloud"].includes(savedBubbleStyle)) accountStorage.setItem("BubbleStyle", "default")
  setFpsVisibility(readBoolean("ShowFps"))
  setTouchscreenMode(readBoolean("Touchscreen"))

  const fontSizeSetting = document.getElementById("fontSizeSetting")
  const fontSizeValue = document.getElementById("fontSizeValue")
  const fontSize = Math.min(135, Math.max(85, Number(accountStorage.getItem("FontSize") || 100)))
  if (fontSizeSetting) fontSizeSetting.value = String(fontSize)
  document.documentElement.style.setProperty("--font-scale", `${fontSize / 100}`)
  if (fontSizeValue) fontSizeValue.textContent = `${fontSize}%`

  const colorSetting = document.getElementById("confettiColorSetting")
  const shapeSetting = document.getElementById("particleShapeSetting")
  const durationSetting = document.getElementById("effectDurationSetting")
  const intensitySetting = document.getElementById("effectIntensitySetting")
  if (colorSetting) colorSetting.value = accountStorage.getItem("ConfettiColors") || ""
  if (shapeSetting) shapeSetting.value = particleShape
  if (durationSetting) durationSetting.value = String(effectDuration)
  if (intensitySetting) intensitySetting.value = String(effectIntensity)
  const durationValue = document.getElementById("effectDurationValue")
  const intensityValue = document.getElementById("effectIntensityValue")
  if (durationValue) durationValue.textContent = `${effectDuration}s`
  if (intensityValue) intensityValue.textContent = `${effectIntensity}%`
}

// Apply the last account's preferences while the login screen is still visible.
// The temporary username keeps account-scoped storage separate from the guest account.
function restorePreLoginSettings() {
  const activeUsername = username
  const lastUsername = getLastUsername()
  if (!lastUsername) return
  username = lastUsername
  reloadAccountSettings()
  username = activeUsername
}

function setupCustomSelects() {
  document.querySelectorAll(".setting-control select:not(.custom-select-ready)").forEach(select => {
    select.classList.add("custom-select-ready")
    const wrapper = document.createElement("div")
    wrapper.className = "custom-select"
    select.parentNode.insertBefore(wrapper, select)
    wrapper.appendChild(select)

    const button = document.createElement("button")
    button.type = "button"
    button.className = "custom-select-button"
    button.setAttribute("aria-haspopup", "listbox")
    button.setAttribute("aria-expanded", "false")

    const menu = document.createElement("div")
    menu.className = "custom-select-menu"
    menu.setAttribute("role", "listbox")
    menu.hidden = false

    const sync = () => {
      const selected = select.options[select.selectedIndex]
      button.firstChild.textContent = selected?.textContent || "Select an option"
      menu.querySelectorAll(".custom-select-option").forEach(option => {
        const active = option.dataset.value === select.value
        option.classList.toggle("is-selected", active)
        option.setAttribute("aria-selected", String(active))
      })
    }

    Array.from(select.options).forEach(option => {
      const item = document.createElement("button")
      item.type = "button"
      item.className = "custom-select-option"
      item.textContent = option.textContent
      item.dataset.value = option.value
      item.setAttribute("role", "option")
      item.addEventListener("click", () => {
        select.value = option.value
        select.dispatchEvent(new Event("input", { bubbles: true }))
        select.dispatchEvent(new Event("change", { bubbles: true }))
        sync()
        wrapper.classList.remove("is-open")
        button.setAttribute("aria-expanded", "false")
        button.focus()
      })
      menu.appendChild(item)
    })

    button.append(document.createTextNode(""))
    button.addEventListener("click", () => {
      const open = wrapper.classList.toggle("is-open")
      button.setAttribute("aria-expanded", String(open))
    })
    select.addEventListener("change", sync)
    wrapper.append(button, menu)
    sync()
  })

  document.addEventListener("click", event => {
    document.querySelectorAll(".custom-select.is-open").forEach(wrapper => {
      if (!wrapper.contains(event.target)) {
        wrapper.classList.remove("is-open")
        wrapper.querySelector(".custom-select-button")?.setAttribute("aria-expanded", "false")
      }
    })
  })
}

function setupCustomThemeCreator() {
  const toggle = document.getElementById("customThemeToggle")
  const form = document.getElementById("customThemeForm")
  const fileInput = document.getElementById("customThemeBackground")
  const fileName = document.getElementById("customThemeFileName")
  const preview = document.getElementById("customThemeBackgroundPreview")
  const previewImage = document.getElementById("customThemeBackgroundImage")
  const removeBackground = document.getElementById("customThemeBackgroundRemove")
  const reset = document.getElementById("customThemeReset")
  const colors = [
    document.getElementById("customThemeColorOne"),
    document.getElementById("customThemeColorTwo"),
    document.getElementById("customThemeColorThree")
  ]
  if (!toggle || !form || colors.some(color => !color)) return

  let backgroundImage = ""
  toggle.addEventListener("click", () => {
    form.hidden = !form.hidden
    toggle.setAttribute("aria-expanded", String(!form.hidden))
  })
  const clearBackgroundSelection = () => {
    backgroundImage = ""
    if (fileInput) fileInput.value = ""
    if (preview) preview.hidden = true
    if (previewImage) previewImage.removeAttribute("src")
    if (fileName) fileName.textContent = "No image selected"
  }

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0]
    if (!file || !file.type.startsWith("image/")) {
      clearBackgroundSelection()
      return
    }
    const reader = new FileReader()
    reader.addEventListener("load", () => {
      backgroundImage = String(reader.result || "")
      if (previewImage) previewImage.src = backgroundImage
      if (preview) preview.hidden = false
      if (fileName) fileName.textContent = file.name
    })
    reader.readAsDataURL(file)
  })

  removeBackground?.addEventListener("click", clearBackgroundSelection)
  form.addEventListener("submit", event => {
    event.preventDefault()
    applyCustomTheme(colors.map(color => color.value), backgroundImage)
    toggle.textContent = "Custom theme active"
  })
  reset?.addEventListener("click", () => {
    clearBackgroundSelection()
    accountStorage.removeItem("CustomTheme")
    toggle.textContent = "Create your own theme"
    applyTheme(Number(accountStorage.getItem("Theme")) || 0)
  })
}

function setupThemes() {
  setupCustomSelects()
  setupCustomThemeCreator()
  const choices = document.getElementById("themeChoices")
  const themeButton = document.getElementById("themeButton")
  if (!choices || !themeButton) return
  if (choices.children.length) return
  themes.forEach((theme, index) => {
    const button = document.createElement("button")
    button.className = "theme-choice"
    const label = document.createElement("span")
    label.textContent = theme[0]
    button.appendChild(label)
    const preview = document.createElement("canvas")
    preview.className = "theme-preview"
    preview.width = 220
    preview.height = 92
    const previewContext = preview.getContext("2d")
    const previewBackground = darkMode ? ["#1e1e1e", "#252526", "#2d2d30"] : theme.slice(1)
    drawLiquid(previewContext, preview.width, preview.height, previewBackground, 0, 0, theme.slice(1))
    button.appendChild(preview)
    button.addEventListener("click", () => applyTheme(index))
    button.addEventListener("pointerenter", () => applyTheme(index, { persist: false }))
    button.addEventListener("pointerleave", () => applyTheme(selectedThemeIndex, { persist: false }))
    choices.appendChild(button)
  })
  let savedTheme = 0
  try {
    savedTheme = Number(accountStorage.getItem("Theme")) || 0
  } catch (error) {
    console.warn("Saved theme is unavailable.", error)
  }
      loadAccountData()
      applyTheme(savedTheme)
      restoreCustomTheme()
  const darkModeToggle = document.getElementById("darkModeToggle")
  if (darkModeToggle) {
    darkModeToggle.checked = darkMode
    darkModeToggle.addEventListener("change", () => {
      darkMode = darkModeToggle.checked
      try { accountStorage.setItem("DarkMode", String(darkMode)) } catch (error) { console.warn("Dark mode preference could not be saved.", error) }
      applyTheme(selectedThemeIndex)
    })
  }
  const silentModeToggle = document.getElementById("silentModeToggle")
  if (silentModeToggle) {
    silentModeToggle.checked = silentMode
    silentModeToggle.addEventListener("change", () => {
      silentMode = silentModeToggle.checked
      try { accountStorage.setItem("SilentMode", String(silentMode)) } catch (error) { console.warn("Silent mode preference could not be saved.", error) }
    })
  }

  const settingControls = [
    ["confettiToggle", "Confetti", value => confettiOnJoins = value, false],
    ["mentionConfettiToggle", "MentionConfetti", null, false],
    ["screenShakeToggle", "ScreenShake", value => screenShake = value, false],
    ["disableEffectsToggle", "DisableEffects", value => effectsDisabled = value, false],
    ["showFpsToggle", "ShowFps", value => setFpsVisibility(value), false],
    ["touchscreenModeToggle", "Touchscreen", value => setTouchscreenMode(value), false],
    ["animatedBackgroundToggle", "AnimatedBackground", value => backgroundPaused = !value, true],
    ["disableBlurToggle", "DisableBlur", value => document.documentElement.classList.toggle("disable-blur", value), false],
    ["reducedMotionToggle", "ReducedMotion", value => document.documentElement.classList.toggle("reduced-motion", value), false],
    ["compactModeToggle", "CompactMode", value => document.documentElement.classList.toggle("compact-mode", value), false],
    ["mentionOnlyToggle", "MentionOnly", null, false],
    ["notificationPreviewToggle", "NotificationPreview", null, false],
    ["autoScrollToggle", "AutoScroll", null, true],
    ["sendOnEnterToggle", "SendOnEnter", null, true],
    ["desktopNotificationsToggle", "DesktopNotifications", null, true],
    ["showTimestampsToggle", "ShowTimestamps", value => document.documentElement.classList.toggle("show-timestamps", value), true],
    ["saveDraftsToggle", "SaveDrafts", null, true],
    ["highContrastToggle", "HighContrast", value => document.documentElement.classList.toggle("high-contrast", value), false],
    ["largeTextToggle", "LargeText", value => document.documentElement.classList.toggle("large-text", value), false]
  ]
  settingControls.forEach(([id, key, setter, defaultValue]) => {
    const control = document.getElementById(id)
    if (!control) return
    let value = defaultValue
    try {
      const saved = accountStorage.getItem(key)
      if (saved !== null) value = saved === "true"
    } catch (error) { console.warn("Setting preference is unavailable.", error) }
    control.checked = value
    setter?.(value)
    control.addEventListener("change", () => {
      setter?.(control.checked)
      accountStorage.setItem(key, String(control.checked))
      if (id === "desktopNotificationsToggle" && control.checked && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {})
      }
    })
  })

  const oldDefaultColors = "#7f5af0, #ffd700, #ffffff"
  if (accountStorage.getItem("ConfettiColors") === oldDefaultColors) accountStorage.removeItem("ConfettiColors")

  const effectControls = [
    ["confettiColorSetting", "ConfettiColors", value => confettiColors = value.split(",").map(item => item.trim()).filter(Boolean)],
    ["particleShapeSetting", "ParticleShape", value => particleShape = value],
    ["effectDurationSetting", "EffectDuration", value => effectDuration = Number(value)],
    ["effectIntensitySetting", "EffectIntensity", value => effectIntensity = Number(value)]
  ]
  effectControls.forEach(([id, key, setter]) => {
    const control = document.getElementById(id)
    if (!control) return
    const saved = accountStorage.getItem(key)
    if (saved !== null) control.value = saved
    if (id === "confettiColorSetting" && !saved) control.value = ""
    setter(control.value)
    if (id === "effectDurationSetting") document.getElementById("effectDurationValue").textContent = `${control.value}s`
    if (id === "effectIntensitySetting") document.getElementById("effectIntensityValue").textContent = `${control.value}%`
    control.addEventListener("input", () => {
      setter(control.value)
      accountStorage.setItem(key, control.value)
      const output = document.getElementById(id.replace("Setting", "Value"))
      if (output) output.textContent = id.includes("Duration") ? `${control.value}s` : `${control.value}%`
    })
  })
  const bubbleStyle = document.getElementById("bubbleStyleSetting")
  if (bubbleStyle) {
    const savedBubbleStyle = accountStorage.getItem("BubbleStyle")
    bubbleStyle.value = ["rounded", "cloud"].includes(savedBubbleStyle) ? "default" : (savedBubbleStyle || "default")
    document.documentElement.dataset.bubbleStyle = bubbleStyle.value
    if (["rounded", "cloud"].includes(savedBubbleStyle)) accountStorage.setItem("BubbleStyle", "default")
    bubbleStyle.addEventListener("change", () => { document.documentElement.dataset.bubbleStyle = bubbleStyle.value; accountStorage.setItem("BubbleStyle", bubbleStyle.value) })
  }

  document.getElementById("logoutButton")?.addEventListener("click", logoutCurrentUser)

  document.getElementById("resetAppDataButton")?.addEventListener("click", () => {
    if (!window.confirm("Delete all saved app data and restore defaults?")) return
    try {
      Object.keys(localStorage).filter(key => key.startsWith("cosmos")).forEach(key => localStorage.removeItem(key))
      document.cookie = "usrnam=; max-age=0; path=/; samesite=lax"
    } catch (error) {
      console.warn("App data could not be reset.", error)
    }
    window.location.reload()
  })
  const fontSizeSetting = document.getElementById("fontSizeSetting")
  const fontSizeValue = document.getElementById("fontSizeValue")
  if (fontSizeSetting) {
    const saved = Number(accountStorage.getItem("FontSize") || 100)
    fontSizeSetting.value = String(Math.min(135, Math.max(85, saved)))
    const update = () => {
      document.documentElement.style.setProperty("--font-scale", `${fontSizeSetting.value / 100}`)
      if (fontSizeValue) fontSizeValue.textContent = `${fontSizeSetting.value}%`
      accountStorage.setItem("FontSize", fontSizeSetting.value)
    }
    fontSizeSetting.addEventListener("input", update)
    update()
  }

  // Reserved for future account-scoped settings.

  themeButton.addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar")
    if (!sidebar) return
    const open = sidebar.classList.toggle("themes-open")
    themeButton.setAttribute("aria-expanded", String(open))
  })
}

// ===== Profile picture and login setup =====
function updatePfpPreview() {
  const preview = document.getElementById("pfpPreview")
  if (!preview) return
  preview.src = pfpData || "./assets/Cosmos-Logo.png"
  preview.alt = username ? `${username}'s profile picture` : "Profile picture"
}

function updateLoginPreview() {
  const nameInput = document.getElementById("loginName")
  const preview = document.getElementById("loginPfpPreview")
  const savedUsername = username || getLastUsername()
  let savedPfp = pfpData

  if (!savedPfp && savedUsername) {
    try {
      savedPfp = window.localStorage.getItem(accountStorageKey("pfp", savedUsername)) || ""
    } catch (error) {
      console.warn("Saved login picture could not be read.", error)
    }
  }

  if (nameInput && savedUsername) nameInput.value = savedUsername
  if (preview) preview.src = savedPfp || "./assets/Cosmos-Logo.png"
}

function logoutCurrentUser() {
  const previousUsername = username
  connected = false
  websocket?.close()
  websocket = null
  username = ""
  try {
    if (previousUsername) window.localStorage.setItem("cosmos:lastUsername", previousUsername)
  } catch (error) {
    console.warn("Last username could not be saved.", error)
  }
  pfpData = ""
  bioText = ""
  statusText = ""
  spotifyUrl = ""
  friends.clear()
  document.cookie = "usrnam=; max-age=0; path=/; samesite=lax"
  document.getElementById("sidebar")?.classList.remove("themes-open")
  document.getElementById("themeButton")?.setAttribute("aria-expanded", "false")
  const overlay = document.getElementById("loginOverlay")
  const loginName = document.getElementById("loginName")
  const loginPfpPreview = document.getElementById("loginPfpPreview")
  if (overlay) overlay.hidden = false
  updateLoginPreview()
  updatePfpPreview()
}

function setupPfpUpload() {
  const button = document.getElementById("pfpButton")
  const fileInput = document.getElementById("pfpUpload")
  if (!button || !fileInput) return

  button.title = "Change profile picture"
  button.setAttribute("aria-label", "Change profile picture")
  button.addEventListener("click", () => fileInput.click())
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.addEventListener("load", () => {
      pfpData = String(reader.result || "")
      accountStorage.setItem("pfp", pfpData)
      updatePfpPreview()
      broadcastProfileUpdate()
      fileInput.value = ""
    })
    reader.readAsDataURL(file)
  })
  updatePfpPreview()
}

function setupLogin() {
  const overlay = document.getElementById("loginOverlay")
  const nameInput = document.getElementById("loginName")
  const fileInput = document.getElementById("loginPfp")
  const preview = document.getElementById("loginPfpPreview")
  const loginCard = document.getElementById("loginCard")
  if (!overlay || !nameInput || !fileInput || !preview || !loginCard) return
  // The app remains behind the setup screen until the user submits it.
  overlay.hidden = false
  updateLoginPreview()
  nameInput.focus()
  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0]
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.addEventListener("load", () => {
      pfpData = String(reader.result || "")
      preview.src = pfpData
    })
    reader.readAsDataURL(file)
  })
  document.getElementById("loginCard").addEventListener("submit", event => {
    event.preventDefault()
    const nextUsername = nameInput.value.trim()
    if (!nextUsername) return
    const selectedPfp = fileInput.files?.length ? pfpData : ""
    username = nextUsername
    try {
      window.localStorage.setItem("cosmos:lastUsername", username)
    } catch (error) {
      console.warn("Last username could not be saved.", error)
    }
    loadAccountData()
    // A picture selected during this login takes priority over saved account data.
    if (selectedPfp) pfpData = selectedPfp
    document.cookie = "usrnam=" + encodeURIComponent(username) + "; max-age=31536000; path=/; samesite=lax"
    try {
      if (selectedPfp) accountStorage.setItem("pfp", selectedPfp)
    } catch (error) {
      console.warn("Profile picture could not be saved.", error)
    }
    reloadAccountSettings()
    restoreCustomTheme()
    updatePfpPreview()
  overlay.hidden = true
  connectToChat()
  })
}

// ===== Info modal =====
const infoButton = document.getElementById("infoButton")
const infoModal = document.getElementById("infoModal")
if (infoButton && infoModal) {
  infoButton.addEventListener("click", () => { infoModal.hidden = false })
}
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => {
  const modal = document.getElementById(button.dataset.close)
  if (modal) modal.hidden = true
}))

if (username == "null") username = ""

var connected = false;
let pingInterval;

function connectToChat() {
  if (websocket || !username) return
  document.body.classList.add('is-loading')
  websocket = new WebSocket(wsUri)
  websocket.onopen = () => {
    try {
      websocket.send('&&j-' + username)
      connected = true
      document.body.classList.remove('is-loading')
      while (pendingMessages.length && websocket.readyState === WebSocket.OPEN) {
        websocket.send(pendingMessages.shift())
      }
    } catch (error) {
      console.warn("Chat connection could not be initialized.", error)
    }
  }
  websocket.onclose = () => {
    if (connected) {
      writeToScreen(JSON.stringify({ username: '&&HarmonyServer', message: 'STARS HAVE FALLEN' }))
    }
    connected = false
    websocket = null
    document.body.classList.remove('is-loading')
  }
  websocket.onmessage = event => writeToScreen(`${event.data}`)
  websocket.onerror = () => {
    connected = false
    document.body.classList.remove('is-loading')
    // Allow the next send or login attempt to establish a fresh socket.
    websocket = null
  }
}

// ===== Animated background =====
const waterCanvas = document.getElementById("waterCanvas")
const waterContext = waterCanvas && waterCanvas.getContext("2d")
let waterFrame = 0
let waterPointerX = .5
let waterPointerY = .5
let backgroundPaused = false
var backgroundOffset = 0
let waterWidth = 0
let waterHeight = 0
let waterPixelRatio = 1

function resizeWaterCanvas() {
  if (!waterCanvas) return
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.15)
  const width = Math.max(1, Math.ceil(innerWidth * pixelRatio))
  const height = Math.max(1, Math.ceil(innerHeight * pixelRatio))
  if (width === waterWidth && height === waterHeight && pixelRatio === waterPixelRatio) return

  waterWidth = width
  waterHeight = height
  waterPixelRatio = pixelRatio
  waterCanvas.width = width
  waterCanvas.height = height
  waterCanvas.style.width = `${innerWidth}px`
  waterCanvas.style.height = `${innerHeight}px`
}

function drawLiquid(context, width, height, colors, offsetX = 0, offsetY = 0, lineColors = colors) {
  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, colors[0])
  gradient.addColorStop(.5, colors[1])
  gradient.addColorStop(1, colors[2])
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  // Layered, warped ribbons approximate the reference's iridescent liquid surface.
  context.save()
  context.globalCompositeOperation = "screen"
  const scale = Math.max(width, height) / 900
  for (let band = -3; band < 12; band++) {
    context.beginPath()
    for (let x = -30; x <= width + 30; x += Math.max(12, 22 * scale)) {
      const ribbon = Math.sin(x * .012 + band * 1.35 + offsetX * 4) * 34 * scale + Math.sin(x * .026 - band * .8) * 18 * scale
      const y = band * height / 9 + ribbon + offsetY * 24
      x === -30 ? context.moveTo(x, y) : context.lineTo(x, y)
    }
    context.lineWidth = Math.max(18, 42 * scale)
    context.strokeStyle = darkMode
      ? (band % 3 === 0 ? "rgba(190,190,195,.16)" : "rgba(145,145,150,.10)")
      : (band % 3 === 0 ? "rgba(255,245,190,.30)" : "rgba(255,255,255,.13)")
    context.stroke()
  }
  context.globalCompositeOperation = "overlay"
  context.lineWidth = Math.max(2, 4 * scale)
  for (let band = -3; band < 12; band++) {
    context.beginPath()
    for (let x = -30; x <= width + 30; x += Math.max(12, 22 * scale)) {
      const y = band * height / 9 + Math.sin(x * .012 + band * 1.35 + offsetX * 4) * 34 * scale + Math.sin(x * .026 - band * .8) * 18 * scale + offsetY * 24
      x === -30 ? context.moveTo(x, y) : context.lineTo(x, y)
    }
    context.strokeStyle = lineColors[(band + 3) % 3]
    context.globalAlpha = darkMode ? .42 : .38
    context.stroke()
  }
  context.restore()
}

function drawWater() {
  if (!waterCanvas || !waterContext) return
  resizeWaterCanvas()
  waterContext.setTransform(waterPixelRatio, 0, 0, waterPixelRatio, 0, 0)
  drawLiquid(waterContext, innerWidth, innerHeight, activeBackgroundColors, waterPointerX + backgroundOffset, waterPointerY, activeLineColors)
  if (!backgroundPaused) backgroundOffset += 0.005
}

window.addEventListener("resize", () => {
  resizeWaterCanvas()
  drawWater()
}, { passive: true })
window.addEventListener("pointermove", event => {
  waterPointerX = (event.clientX / innerWidth) / 25
  waterPointerY = event.clientY / innerHeight
  
  if (!waterFrame) waterFrame = requestAnimationFrame(() => { waterFrame = 0; drawWater() })
}, { passive: true })
drawWater()


// Keep the background moving only while animation is enabled.
setInterval(() => {
  if (!backgroundPaused && !document.hidden) drawWater()
}, 30)
// Restore the previous account's appearance before displaying the login screen.
// This keeps the login overlay and the page behind it consistent after refresh.
restorePreLoginSettings()

// Initialize controls only after the canvas state exists. This prevents the
// saved-theme restore from stopping the login handler during page startup.
setupPfpUpload()
setupThemes()
setupSidebarTabs()
setupBio()
setupLogin()

// Keep the composer above an onscreen keyboard when touchscreen mode is enabled.
function setTouchscreenMode(enabled) {
  const root = document.documentElement
  root.classList.toggle("touchscreen-mode", enabled)
  if (!enabled) root.style.setProperty("--keyboard-inset", "0px")
  else updateKeyboardInset()
}

function updateKeyboardInset() {
  if (!document.documentElement.classList.contains("touchscreen-mode")) return
  const viewport = window.visualViewport
  const keyboardHeight = viewport ? Math.max(0, window.innerHeight - viewport.height) : 0
  document.documentElement.style.setProperty("--keyboard-inset", `${keyboardHeight}px`)
}

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", updateKeyboardInset, { passive: true })
  window.visualViewport.addEventListener("scroll", updateKeyboardInset, { passive: true })
}
window.addEventListener("resize", updateKeyboardInset, { passive: true })

// ===== Server messages and rendering =====
function normalizeMention(value) {
  return String(value || "").replace(/^@/, "").replaceAll("_", " ").trim().toLowerCase()
}

function getMentionNames(message) {
  return String(message || "").match(/@[a-z0-9]+(?:[_-][a-z0-9]+)*/gi) || []
}

function playNotificationSound() {
  const pinger = document.getElementById("pinger")
  // The soundboard setting was removed; notification sounds use full volume.
  if (!pinger || silentMode) return
  pinger.volume = 1
  pinger.pause()
  pinger.currentTime = 0
  pinger.play().catch(() => {})
}

function celebrateJoin() {
  if (!confettiOnJoins || effectsDisabled) return
  const count = Math.round(90 * effectIntensity / 100)
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span")
    piece.className = `confetti-piece ${particleShape}`
    piece.style.left = `${Math.random() * 100}vw`
    const palette = confettiColors.length ? confettiColors : activeThemeColors
    piece.style.background = palette[i % palette.length] || "var(--accent)"
    piece.style.animationDuration = `${effectDuration}s`
    piece.style.animationDelay = `${Math.random() * .35}s`
    if (particleShape === "stars") piece.textContent = "★"
    document.body.appendChild(piece)
    setTimeout(() => piece.remove(), (effectDuration + 1) * 1000)
  }
  if (screenShake) {
    document.body.classList.add("screen-shake")
    setTimeout(() => document.body.classList.remove("screen-shake"), 500)
  }
}

function showServerToast(message) {
  const toast = document.getElementById("serverToast")
  if (!toast) return
  toast.textContent = message
  const sidebarPfp = document.getElementById("pfpPreview")
  sidebarPfp?.classList.remove("server-notification-pfp")
  void sidebarPfp?.offsetWidth
  sidebarPfp?.classList.add("server-notification-pfp")
  toast.classList.remove("is-visible")
  requestAnimationFrame(() => toast.classList.add("is-visible"))
  clearTimeout(showServerToast.timeout)
  showServerToast.timeout = setTimeout(() => toast.classList.remove("is-visible"), 4500)
}

function createDeliveryIndicator(messageElement) {
  const progress = document.createElement("span")
  progress.className = "delivery-progress"
  progress.setAttribute("aria-label", "Sending message")
  messageElement.querySelector(".message-content")?.appendChild(progress)

  // Let the zero-width state paint before beginning the delivery animation.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (messageElement.classList.contains("is-pending")) {
        messageElement.classList.add("is-sending")
      }
    })
  })
}

function markMessageDelivered(text) {
  const pending = pendingDelivery.get(text)
  if (!pending) return
  clearTimeout(pending.timeout)
  pendingDelivery.delete(text)
  pending.element.classList.remove("is-pending", "is-sending")
  pending.element.classList.add("is-delivered")
}

function markMessageFailed(text) {
  const pending = pendingDelivery.get(text)
  if (!pending) return
  clearTimeout(pending.timeout)
  pendingDelivery.delete(text)
  pending.element.classList.remove("is-pending", "is-sending")
  pending.element.classList.add("send-failed")
  const progress = pending.element.querySelector(".delivery-progress")
  if (progress) progress.setAttribute("aria-label", "Message failed to send")
}

function writeToScreen(message, options = {}) {
  let json
  try {
    json = typeof message === "string" ? JSON.parse(message) : message
  } catch (error) {
    console.warn("Ignoring invalid server message.", error)
    return
  }
  if (!json || !output) return

  // Profile packets are consumed silently. The message check also handles
  // servers that preserve only the message field when broadcasting JSON.
  if (json.message === profileUpdateMessage || json.profileUpdate === true || json.type === "profile-update") {
    rememberServerMember(json)
    updateFriendProfile(json)
    return
  }

  // Some server versions send the current member list with join/leave events.
  // Add those users immediately so the open mention picker stays current.
  const liveMembers = Array.isArray(json.members) ? json.members : (Array.isArray(json.users) ? json.users : [])
  liveMembers.forEach(member => rememberServerMember(typeof member === "string" ? { username: member } : member))

  // Commands are handled by the server and must never become chat bubbles.
  // This also suppresses the server's echo of the command itself.
  if (json.username === username && commandMessages.has(String(json.message))) {
    commandMessages.delete(String(json.message))
    return
  }

  // Sent messages are rendered immediately. Ignore only the later matching
  // server echo; the local optimistic render must continue to the DOM append.
  if (!options.pending && json.username === username) {
    const optimisticIndex = optimisticMessages.indexOf(String(json.message))
    if (optimisticIndex !== -1) {
      optimisticMessages.splice(optimisticIndex, 1)
      markMessageDelivered(String(json.message))
      return
    }
  }

  // Every normal message also carries the sender's latest profile fields.
  // This keeps friends synchronized even if a server drops silent packets.
  updateFriendProfile(json)
  rememberServerMember(json)

  var div = document.createElement("div");

if (json.username == "&&HarmonyServer") {
  // Join/leave notices are the real-time member updates on older servers.
  const serverMessage = String(json.message || "")
  const memberMatch = serverMessage.match(/(?:^|\s)([a-z0-9_-]+)\s+(?:joined|entered|connected|left|disconnected)\b/i)
  if (memberMatch) {
    const memberName = memberMatch[1]
    if (/left|disconnected/i.test(serverMessage)) serverMembers.delete(memberName)
    else if (normalizeMention(memberName) !== normalizeMention(username)) {
      serverMembers.set(memberName, { username: memberName, pfp: "./assets/Cosmos-Logo.png" })
    }
    renderServerMembers()
    refreshMentionPicker()
  }
  // Server events are shown as a toast only, not as chat messages.
  if (/join|joined|enter|connected/i.test(serverMessage)) celebrateJoin()
  showServerToast(json.message)
  if (!silentMode) playNotificationSound()
  return
} else {
  div.className = "message";

  // Add sent or received class for bubble direction
  if (json.username === username) {
    div.classList.add("sent");
    if (serverMembersPreview) serverMembersPreview.src = json.pfp || pfpData || "./assets/Cosmos-Logo.png"
  } else {
    div.classList.add("received");
  }
  var pfp = document.createElement("img")
  pfp.className = "pfp"
  pfp.src = json.pfp || "./assets/Cosmos-Logo.png"
  pfp.alt = `${json.username}'s profile picture`
  pfp.dataset.username = json.username
  const isSelf = json.username === username
  pfp.title = isSelf ? "Open your bio" : (friends.has(json.username) ? "Unfriend" : "Add friend")
  pfp.classList.toggle("is-friend", friends.has(json.username))
  if (friends.has(json.username)){

  }
  pfp.addEventListener("click", () => {
    const profile = { username: json.username, pfp: pfp.src, bio: json.bio || "", status: json.status || "", spotify: json.spotify || "", notes: friends.get(json.username)?.notes || "" }
    if (isSelf) showFriendBio(profile)
    else toggleFriend(profile)
  })
  div.appendChild(pfp)
  
  var puser = document.createElement("p");
  puser.className = "username";
  puser.textContent = json.username
  div.appendChild(puser);

  var pmsg = document.createElement("p");
  pmsg.className = "message-content";
  var final = stylizeText(escapeHtml(json.message), username);

  const sentAt = json.timestamp || json.time || Date.now()
  const messageTime = new Date(sentAt)
  const timeLabel = Number.isNaN(messageTime.getTime()) ? "" : messageTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  pmsg.innerHTML = `<span class="bubble-text">${final}</span>`;
  div.appendChild(pmsg);
  const time = document.createElement("time")
  time.className = "message-time"
  time.dateTime = messageTime.toISOString?.() || ""
  time.textContent = timeLabel
  div.appendChild(time)
  if (options.pending) {
    div.classList.add("is-pending")
    createDeliveryIndicator(div)
    pendingDelivery.set(String(json.message), {
      element: div,
      timeout: setTimeout(() => markMessageFailed(String(json.message)), sendFailureTimeout)
    })
  }
  // Notify only the mentioned user (or everyone when there is no mention).
  if (json.username !== username) {
    const mentions = getMentionNames(json.message)
    const hasMention = mentions.length > 0
    const mentionsThisUser = mentions.some(name => normalizeMention(name) === normalizeMention(username))
    const mentionOnly = accountStorage.getItem("MentionOnly") === "true"
    const shouldNotify = hasMention ? mentionsThisUser : !mentionOnly
    const awayFromChat = document.hidden || !document.hasFocus()
    if (shouldNotify && awayFromChat) {
      const notificationsEnabled = accountStorage.getItem("DesktopNotifications") !== "false"
      const previewsEnabled = accountStorage.getItem("NotificationPreview") !== "false"
      if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
        new Notification(json.username, { body: previewsEnabled ? json.message : "New message" })
      }
      if (!silentMode) playNotificationSound()
    }
  }
}


  var scroll = false;
  const atNewest = Math.abs(output.scrollHeight - output.offsetHeight - output.scrollTop) <= 2
  if (!atNewest && !document.hasFocus()) {
    div.classList.add("unread");
    unreads += 1;
    if (titleElement) titleElement.innerText = `(${unreads}) ${clientName}`;
    updateMissedMessages();
  } else {
    scroll = true;
  }

  output.appendChild(div);
  if (scroll) {
    // Avoid smooth scrolling here; it makes a newly sent bubble feel delayed.
    output.scrollTop = output.scrollHeight
  }
}


// ===== Message formatting and unread tracking =====
function stylizeText(text, mentionedUsername = ""){ 
  var t = text.split(" ")
  var arr = []
  for (let i = 0; i < t.length; i++) {
    const element = t[i]
    var final = element
    // <e:http://example.com/>
    if (element.includes("&lt;e:")){
      var url = element.replace("&lt;e:", "").replace("&gt;", "")
      final = `<img class="emoji" src=${url}>`
    // <img:http://example.com>
    } else if (element.includes("&lt;img:")){
      var url = element.replace("&lt;img:", "").replace("&gt;", "")
      final = `<img class="full" src=${url}>`
    } else {
      const mention = element.match(/^(@[a-z0-9]+(?:[_-][a-z0-9]+)*)([,.!?;:]*)$/i)
      if (mention) {
        const isMentionedUser = normalizeMention(mention[1]) === normalizeMention(mentionedUsername)
        final = `<span class="mention${isMentionedUser ? " mention-target" : ""}">${mention[1]}${mention[2]}</span>`
      }
    }
    arr.push(final)
  }
  return arr.join(" ")
}

function testForRead(){
  if (!output) return
  if (Math.round(output.scrollTop) === (output.scrollHeight - output.offsetHeight)){
    output.querySelectorAll(".message.unread").forEach(message => message.classList.remove("unread"))

    unreads = 0
    if (titleElement) titleElement.innerText = clientName
    updateMissedMessages()
  }
}

// Check unread state only while the page is visible; this avoids background
// timer work without changing the read behavior.
setInterval(() => {
  if (!document.hidden) testForRead()
}, 500)

// ===== Sending messages and keyboard shortcuts =====
function sendMessage(message) {
  if (!username) return false

  const text = String(message).trim()
  if (!text) return false

    const packet = JSON.stringify({
    message: text,
    username,
    pfp: pfpData,
    bio: bioText,
    status: statusText,
    spotify: spotifyUrl,
    timestamp: Date.now()
  })

  const isRoomCommand = /^\/room(?:\s|$)/i.test(text)
  if (isRoomCommand) commandMessages.add(text)

  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    if (!websocket || websocket.readyState === WebSocket.CLOSED) connectToChat()
    pendingMessages.push(packet)
    if (!isRoomCommand) {
      optimisticMessages.push(text)
      writeToScreen(packet, { pending: true })
    }
    return true
  }

  try {
    websocket.send(packet)
    if (isRoomCommand) return true
    optimisticMessages.push(text)
    // Render before waiting for the server echo so the bubble and progress bar
    // begin in the same event as the send action.
    writeToScreen(packet, { pending: true })
    return true
  } catch (error) {
    console.warn("Message could not be sent.", error)
    writeToScreen(packet, { pending: true })
    markMessageFailed(text)
    return false
  }
}

const escapeHtml = unsafe => {
  return unsafe
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

// ===== Mention autocomplete =====
const mentionPicker = document.getElementById("mentionPicker")
const messageInput = document.getElementById("msg-box")
const serverMembersPreview = document.getElementById("pfpPreview")

// Enter-to-send is controlled by the saved setting; Shift+Enter keeps the
// native line-break behavior available on keyboards that support it.
messageInput?.addEventListener("keydown", event => {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return
  if (accountStorage.getItem("SendOnEnter") === "false") return
  event.preventDefault()
  send()
})
const serverMembers = new Map()
let mentionOptions = []
let activeMentionIndex = 0

// Keep @ autocomplete independent from friends and resilient when the picker
// is recreated by other sidebar controls.
function getMentionContext() {
  if (!messageInput) return null
  const beforeCursor = messageInput.value.slice(0, messageInput.selectionStart ?? messageInput.value.length)
  const match = beforeCursor.match(/(?:^|\s)@([a-z0-9_-]*)$/i)
  if (!match) return null
  return { query: match[1].toLowerCase(), start: beforeCursor.length - match[0].length + (match[0][0] === " " ? 1 : 0) }
}

function refreshMentionPicker() {
  if (!mentionPicker || !messageInput) return
  const context = getMentionContext()
  if (!context) {
    closeMentionPicker()
    return
  }

  const activeName = username || document.getElementById("loginName")?.value.trim()
  const activeNameKey = normalizeMention(activeName)
  const names = new Set(getKnownServerMembers())
  mentionOptions = [...names]
    .filter(name => normalizeMention(name) !== activeNameKey)
    .filter(name => name.toLowerCase().replaceAll(" ", "_").startsWith(context.query))
    .sort((a, b) => a.localeCompare(b))
  activeMentionIndex = Math.min(activeMentionIndex, Math.max(0, mentionOptions.length - 1))

  mentionPicker.replaceChildren()
  mentionPicker.hidden = false
  if (!mentionOptions.length) {
    const empty = document.createElement("span")
    empty.className = "mention-empty"
    empty.textContent = "No one found"
    mentionPicker.appendChild(empty)
  }
  mentionOptions.forEach((name, index) => {
    const option = document.createElement("button")
    option.type = "button"
    option.className = `mention-option${index === activeMentionIndex ? " is-active" : ""}`
    option.textContent = `@${name}`
    option.addEventListener("mousedown", event => {
      event.preventDefault()
      const value = messageInput.value
      const cursor = messageInput.selectionStart ?? value.length
      const prefix = value.slice(0, context.start)
      const suffix = value.slice(cursor)
      messageInput.value = `${prefix}@${name} ${suffix}`
      const nextCursor = prefix.length + name.length + 2
      messageInput.setSelectionRange(nextCursor, nextCursor)
      messageInput.focus()
      closeMentionPicker()
    })
    mentionPicker.appendChild(option)
  })
  mentionPicker.hidden = mentionOptions.length === 0
}

messageInput?.addEventListener("input", () => {
  activeMentionIndex = 0
  refreshMentionPicker()
})
messageInput?.addEventListener("keydown", event => {
  if (!mentionPicker || mentionPicker.hidden || !mentionOptions.length) return
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault()
    const direction = event.key === "ArrowDown" ? 1 : -1
    activeMentionIndex = (activeMentionIndex + direction + mentionOptions.length) % mentionOptions.length
    refreshMentionPicker()
  } else if (event.key === "Enter" || event.key === "Tab") {
    event.preventDefault()
    mentionPicker.querySelector(".mention-option.is-active")?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
  } else if (event.key === "Escape") {
    closeMentionPicker()
  }
})

function renderServerMembers() {
  const serverMembersMenu = document.getElementById("serverMembersMenu")
  if (!serverMembersMenu) return
  serverMembersMenu.replaceChildren()
  const members = [...serverMembers.values()].sort((a, b) => a.username.localeCompare(b.username))
  if (!members.length) {
    const empty = document.createElement("span")
    empty.className = "server-member-name"
    empty.textContent = "No server members yet"
    serverMembersMenu.appendChild(empty)
    return
  }
  members.forEach(member => {
    const entry = document.createElement("div")
    entry.className = "server-member"
    entry.setAttribute("role", "menuitem")
    const image = document.createElement("img")
    image.src = member.pfp || "./assets/Cosmos-Logo.png"
    image.alt = `${member.username}'s profile picture`
    const name = document.createElement("span")
    name.className = "server-member-name"
    name.textContent = member.username
    entry.append(image, name)
    serverMembersMenu.appendChild(entry)
  })
}

function rememberServerMember(profile) {
  if (!profile?.username || profile.username === "&&HarmonyServer") return
  serverMembers.set(profile.username, {
    username: profile.username,
    pfp: profile.pfp || "./assets/Cosmos-Logo.png"
  })
  renderServerMembers()
  // Refresh an open picker as soon as a new member packet arrives.
  refreshMentionPicker()
}



function getKnownServerMembers() {
  // Autocomplete is based only on users visible in this server chat, not friends.
  return [...serverMembers.keys()].sort((a, b) => a.localeCompare(b))
}

function closeMentionPicker() {
  if (!mentionPicker) return
  mentionPicker.hidden = true
  mentionPicker.replaceChildren()
  mentionOptions = []
  activeMentionIndex = 0
}

function selectMention(name) {
  if (!messageInput) return
  const cursor = messageInput.selectionStart ?? messageInput.value.length
  const beforeCursor = messageInput.value.slice(0, cursor)
  const match = beforeCursor.match(/(^|\s)@([a-z0-9_-]*)$/i)
  if (!match) return closeMentionPicker()
  const start = cursor - match[0].length + match[1].length
  messageInput.value = `${messageInput.value.slice(0, start)}@${name} ${messageInput.value.slice(cursor)}`
  const nextCursor = start + name.length + 2
  messageInput.setSelectionRange(nextCursor, nextCursor)
  messageInput.focus()
  closeMentionPicker()
}

function renderMentionPicker(names) {
  if (!mentionPicker) return
  mentionPicker.replaceChildren()
  mentionOptions = names
  activeMentionIndex = 0
  names.forEach((name, index) => {
    const option = document.createElement("button")
    option.type = "button"
    option.className = "mention-option"
    option.setAttribute("role", "option")
    option.textContent = `@${name}`
    option.addEventListener("mousedown", event => {
      event.preventDefault()
      selectMention(name)
    })
    mentionPicker.appendChild(option)
  })
  mentionPicker.hidden = names.length === 0
  mentionPicker.querySelector(".mention-option")?.classList.add("is-active")
}

function updateMentionPicker() {
  // Keep the older event hooks in sync with the main picker implementation.
  // The previous version rebuilt the list without the signed-in user, which
  // hid the picker whenever no other server member had spoken yet.
  refreshMentionPicker()
}

messageInput?.addEventListener("input", updateMentionPicker)
messageInput?.addEventListener("click", updateMentionPicker)
messageInput?.addEventListener("keyup", event => {
  if (["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(event.key)) return
  updateMentionPicker()
})

document.addEventListener("keydown", event => {
  if (!mentionPicker || mentionPicker.hidden || document.activeElement !== messageInput) return
  if (event.key === "Escape") {
    event.preventDefault()
    closeMentionPicker()
    return
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault()
    activeMentionIndex = (activeMentionIndex + (event.key === "ArrowDown" ? 1 : -1) + mentionOptions.length) % mentionOptions.length
    mentionPicker.querySelectorAll(".mention-option").forEach((option, index) => option.classList.toggle("is-active", index === activeMentionIndex))
    mentionPicker.querySelectorAll(".mention-option")[activeMentionIndex]?.scrollIntoView({ block: "nearest" })
    return
  }
  if (event.key === "Enter" && mentionOptions[activeMentionIndex]) {
    event.preventDefault()
    event.stopImmediatePropagation()
    selectMention(mentionOptions[activeMentionIndex])
  }
})

document.addEventListener("keydown", event => {
  if (event.key !== "Enter" || event.isComposing) return

  const loginOverlay = document.getElementById("loginOverlay")
  if (loginOverlay && !loginOverlay.hidden) {
    event.preventDefault()
    document.getElementById("loginCard")?.requestSubmit()
    return
  }

  if (document.activeElement?.id === "msg-box") {
    event.preventDefault()
    send()
  }
})

function send(){
  const input = document.getElementById("msg-box")
  if (!input || !input.value.trim()) return
  if (!sendMessage(input.value)) return
  input.value = ""

  if ("Notification" in window && Notification.permission === "default"){
    // Notification.requestPermission()
  }
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie
    try {
      decodedCookie = decodeURIComponent(document.cookie)
    } catch (error) {
      decodedCookie = document.cookie
    }
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
        c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
        }
    }
    return "";
}

// ===== Emoji picker and file/image tools =====
function popup_info(){
  var popup = window.open("./info.html", "_blank", {"popup": true})
}

let customEmojiFiles = []
const emojiList = [
  "happy.svg",
  "laugh.svg",
  "smug.svg",
  "sad.svg",
  "tears.svg",
  "sob.svg",
  "tired.svg",
  "dizzy.svg",
  "suspicious.svg",
  "angry.svg",
  "evil.svg",
  "cyn.svg",
  "uzi.svg",
  // Add your emoji filenames here from /assets/emojis/
];

function toggleEmojiPopup() {
  const popup = document.getElementById("emojiPopup")
  const button = document.getElementById("emojiBtn")
  if (!popup) return
  const isOpen = popup.style.display !== "grid"
  popup.style.display = isOpen ? "grid" : "none"
  popup.setAttribute("aria-hidden", String(!isOpen))
  button?.setAttribute("aria-expanded", String(isOpen))
  popup.style.pointerEvents = isOpen ? "auto" : "none"
  if (isOpen) loadEmojis()
}

function loadEmojis() {
  const popup = document.getElementById("emojiPopup");
  if (!popup) return
  if (popup.children.length > 0) return; // Prevent re-adding emojis

  emojiList.forEach(name => {
    const img = document.createElement("img");
    img.src = "./assets/emojis/" + name;
    img.alt = name.replace(/\.[^.]+$/, "");
    img.title = img.alt;
    img.style.width = "30px";
    img.style.height = "30px";
    img.style.flex = "0 0 30px";
    img.style.cursor = "pointer";
    img.style.margin = "2px";
    img.onclick = () => addEmojiToInput(name);
    popup.appendChild(img);
  });
  customEmojiFiles.forEach(file => {
    const img = document.createElement("img")
    img.src = URL.createObjectURL(file)
    img.alt = file.name.replace(/\.[^.]+$/, "")
    img.title = img.alt
    img.style.cssText = "width:30px;height:30px;flex:0 0 30px;cursor:pointer;margin:2px"
    img.onclick = () => addEmojiToInput(img.src)
    popup.appendChild(img)
  })
}

function addEmojiToInput(fileName) {
  const input = document.getElementById("msg-box");
  if (!input) return
  const emojiTag = `<e:./assets/emojis/${fileName}>`;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const text = input.value;
  input.value = text.substring(0, start) + emojiTag + text.substring(end);
  input.selectionStart = input.selectionEnd = start + emojiTag.length;
  input.focus();
}

const imageButton = document.getElementById("image_button")
const fileUpload = document.getElementById("fileupload")
if (imageButton && fileUpload) {
  imageButton.addEventListener("click", () => fileUpload.click())
  fileUpload.addEventListener("change", () => {
    const file = fileUpload.files && fileUpload.files[0]
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.addEventListener("load", () => {
      const input = document.getElementById("msg-box")
      if (input) input.value += `<img:${reader.result}>`
      fileUpload.value = ""
    })
    reader.readAsDataURL(file)
  })
}

// ===== Draft saving, chat search, and composer shortcuts =====
(() => {
  const composer = document.getElementById("msg-box")

  const storageKey = () => `cosmos:${normalizeAccountName(username || "guest")}:Draft`

  function readSetting(key, fallback = true) {
    try {
      const value = accountStorage.getItem(key)
      return value === null ? fallback : value === "true"
    } catch (_) {
      return fallback
    }
  }

  function restoreDraft() {
    if (!composer || !readSetting("SaveDrafts")) return
    try { composer.value = localStorage.getItem(storageKey()) || "" } catch (_) {}
  }

  function saveDraft() {
    if (!composer || !readSetting("SaveDrafts")) return
    try {
      if (composer.value) localStorage.setItem(storageKey(), composer.value)
      else localStorage.removeItem(storageKey())
    } catch (_) {}
  }

  function clearDraftAfterSend() {
    try { localStorage.removeItem(storageKey()) } catch (_) {}
  }

  composer?.addEventListener("input", saveDraft)
  composer?.addEventListener("keydown", event => {
    if (event.key !== "Escape") return
    composer.value = ""
    saveDraft()
    composer.focus()
  })
  document.addEventListener("keydown", event => {
    if (event.key === "/" && document.activeElement !== composer && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
      event.preventDefault()
      composer?.focus()
    }
  })

  const originalSend = window.send
  if (typeof originalSend === "function") {
    window.send = (...args) => {
      const result = originalSend(...args)
      if (result !== false) clearDraftAfterSend()
      return result
    }
  }

  restoreDraft()
  window.addEventListener("beforeunload", saveDraft)
})()
