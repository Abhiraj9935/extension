document.addEventListener('DOMContentLoaded', async () => {
  const currentSiteBadge = document.getElementById('currentSiteBadge');
  const noteInput = document.getElementById('noteInput');
  const saveBtn = document.getElementById('saveBtn');
  const notesContainer = document.getElementById('notesContainer');

  let activeDomain = 'General';

  // 1. Get current browser tab domain name
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const url = new URL(tab.url);
      if (url.protocol.startsWith('http')) {
        activeDomain = url.hostname.replace('www.', '');
      }
    }
  } catch (err) {
    console.log('Unable to detect active URL:', err);
  }

  currentSiteBadge.textContent = activeDomain;

  // 2. Load and render all existing notes grouped by site columns
  renderAllNotes();

  // 3. Save new note under current site column with timestamp
  saveBtn.addEventListener('click', () => {
    const noteText = noteInput.value.trim();
    if (!noteText) return;

    const timestamp = new Date().toLocaleString([], {
      dateStyle: 'short',
      timeStyle: 'short'
    });

    chrome.storage.local.get(['siteNotes'], (result) => {
      const allSiteNotes = result.siteNotes || {};

      if (!allSiteNotes[activeDomain]) {
        allSiteNotes[activeDomain] = [];
      }

      // Add new note entry
      allSiteNotes[activeDomain].unshift({
        id: Date.now(),
        text: noteText,
        time: timestamp
      });

      chrome.storage.local.set({ siteNotes: allSiteNotes }, () => {
        noteInput.value = '';
        renderAllNotes();
      });
    });
  });

  // Helper function to render site columns
  function renderAllNotes() {
    chrome.storage.local.get(['siteNotes'], (result) => {
      const allSiteNotes = result.siteNotes || {};
      notesContainer.innerHTML = '';

      const domains = Object.keys(allSiteNotes);

      if (domains.length === 0) {
        notesContainer.innerHTML = '<p style="font-size: 11px; color: #64748b; text-align: center;">No saved notes yet.</p>';
        return;
      }

      domains.forEach((domain) => {
        const notes = allSiteNotes[domain];
        if (!notes || notes.length === 0) return;

        // Create Site Column Container
        const siteCol = document.createElement('div');
        siteCol.className = 'site-column';

        const siteTitle = document.createElement('div');
        siteTitle.className = 'site-title';
        siteTitle.textContent = `🌐 ${domain}`;
        siteCol.appendChild(siteTitle);

        // Append Notes for this site
        notes.forEach((item) => {
          const card = document.createElement('div');
          card.className = 'note-card';

          card.innerHTML = `
            <div class="note-text">${escapeHtml(item.text)}</div>
            <span class="note-time">🕒 ${item.time}</span>
            <button class="delete-btn" data-domain="${domain}" data-id="${item.id}">✕</button>
          `;

          siteCol.appendChild(card);
        });

        notesContainer.appendChild(siteCol);
      });

      // Attach delete click handlers
      document.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const dom = e.target.getAttribute('data-domain');
          const noteId = Number(e.target.getAttribute('data-id'));
          deleteNote(dom, noteId);
        });
      });
    });
  }

  function deleteNote(domain, id) {
    chrome.storage.local.get(['siteNotes'], (result) => {
      const allSiteNotes = result.siteNotes || {};
      if (allSiteNotes[domain]) {
        allSiteNotes[domain] = allSiteNotes[domain].filter(item => item.id !== id);
        if (allSiteNotes[domain].length === 0) {
          delete allSiteNotes[domain];
        }
      }
      chrome.storage.local.set({ siteNotes: allSiteNotes }, () => {
        renderAllNotes();
      });
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[m]);
  }
});
