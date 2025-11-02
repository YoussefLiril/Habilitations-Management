// details.js
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:3000/api";
  const urlParams = new URLSearchParams(window.location.search);
  const matricule = urlParams.get('matricule');
  
  if (!matricule) {
    showNotification('Aucun matricule spécifié', 'error');
    setTimeout(() => window.location.href = 'apercu.html', 2000);
    return;
  }

  // Load employee details and attachments
  loadEmployeeDetails(matricule);
  loadAttachments(matricule);
  setupEventListeners();

  async function loadEmployeeDetails(matricule) {
    try {
      showLoading(true);
      const response = await fetch(`${API_BASE}/employees/${matricule}`);
      
      if (!response.ok) {
        throw new Error('Employé non trouvé');
      }
      
      const employee = await response.json();
      displayEmployeeDetails(employee);
      showNotification('Détails de l\'employé chargés', 'success');
    } catch (error) {
      console.error('Error loading employee details:', error);
      showNotification('Employé non trouvé', 'error');
      setTimeout(() => window.location.href = 'apercu.html', 2000);
    } finally {
      showLoading(false);
    }
  }

  function displayEmployeeDetails(employee) {
    const container = document.getElementById('employeeDetails');
    if (!container) return;
    
    const habilitations = JSON.parse(employee.habilitations || '[]')
      .map(h => `<span class="habilitation-tag">${h}</span>`)
      .join('');
    
    container.innerHTML = `
      <div class="employee-info">
        <div class="info-group">
          <label>Matricule</label>
          <span>${employee.matricule}</span>
        </div>
        <div class="info-group">
          <label>Nom</label>
          <span>${employee.nom}</span>
        </div>
        <div class="info-group">
          <label>Prénom</label>
          <span>${employee.prenom}</span>
        </div>
        <div class="info-group">
          <label>Division</label>
          <span>${employee.division || '-'}</span>
        </div>
        <div class="info-group">
          <label>Service</label>
          <span>${employee.service || '-'}</span>
        </div>
        <div class="info-group">
          <label>Section</label>
          <span>${employee.section || '-'}</span>
        </div>
        <div class="info-group">
          <label>Équipe</label>
          <span>${employee.equipe || '-'}</span>
        </div>
        <div class="info-group">
          <label>Fonction</label>
          <span>${employee.fonction || '-'}</span>
        </div>
        <div class="info-group">
          <label>N° du Titre</label>
          <span>${employee.titre || '-'}</span>
        </div>
        <div class="info-group">
          <label>Date Validation</label>
          <span>${formatDate(employee.validation)}</span>
        </div>
        <div class="info-group">
          <label>Date Expiration</label>
          <span class="${getExpirationColor(employee.expiration)}">${formatDate(employee.expiration)}</span>
        </div>
        <div class="info-group" style="grid-column: 1 / -1;">
          <label>Habilitations</label>
          <div class="habilitations-list">${habilitations}</div>
        </div>
      </div>
    `;
  }

  async function loadAttachments(matricule) {
    try {
      const response = await fetch(`${API_BASE}/files/${matricule}`);
      if (response.ok) {
        const files = await response.json();
        displayAttachments(files);
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  }

  function displayAttachments(files) {
    const container = document.getElementById('attachmentsList');
    if (!container) return;
    
    if (files.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Aucune pièce jointe</p>';
      return;
    }

    container.innerHTML = files.map(file => `
      <div class="attachment-item" onclick="openAttachment('${file.filename}')">
        <div class="attachment-icon">📄</div>
        <div class="attachment-name">${file.original_name || file.filename}</div>
        <div class="attachment-date">${formatDate(file.uploaded_at)}</div>
      </div>
    `).join('');
  }

  function setupEventListeners() {
    // Edit button
    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        window.location.href = `gestion.html?edit=${matricule}`;
      });
    }

    // Delete button
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        showModal(
          'Êtes-vous sûr de vouloir supprimer cet employé ? Cette action est irréversible.',
          confirmDelete
        );
      });
    }

    // Delete confirmation
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', confirmDelete);
    }
    
    if (cancelDeleteBtn) {
      cancelDeleteBtn.addEventListener('click', () => {
        document.getElementById('confirmModal').classList.add('hidden');
      });
    }
  }

  async function confirmDelete() {
    try {
      const response = await fetch(`${API_BASE}/employees/${matricule}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showNotification('Employé supprimé avec succès', 'success');
        setTimeout(() => window.location.href = 'apercu.html', 1000);
      } else {
        const result = await response.json();
        showNotification(result.error || 'Erreur lors de la suppression', 'error');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      showNotification('Erreur de connexion au serveur', 'error');
    }
  }

  function showModal(message, confirmCallback) {
    const modal = document.getElementById('confirmModal');
    const modalMessage = document.getElementById('modalMessage');
    
    if (modal && modalMessage) {
      modalMessage.textContent = message;
      modal.classList.remove('hidden');
      
      // Store the confirm callback
      modal._confirmCallback = confirmCallback;
    }
  }

  function showLoading(loading) {
    const container = document.getElementById('employeeDetails');
    if (container && loading) {
      container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">Chargement des détails...</div>';
    }
  }

  function getExpirationColor(expirationDate) {
    if (!expirationDate) return 'gray';
    
    const today = new Date();
    const exp = new Date(expirationDate);
    const diffMonths = (exp - today) / (1000 * 60 * 60 * 24 * 30);
    
    if (diffMonths > 6) return "green";
    if (diffMonths > 3) return "blue";
    if (diffMonths > 1) return "orange";
    if (diffMonths > 0) return "red";
    return "purple";
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '1rem 1.5rem',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '600',
      zIndex: '1000',
      backgroundColor: type === 'error' ? '#FF6B6B' : 
                     type === 'success' ? '#4ECDC4' : '#292F36'
    });

    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
});

// Global function to open attachments
function openAttachment(filename) {
  window.open(`http://localhost:3000/uploads/${filename}`, '_blank');
}

// details.js - Add these new functions and update existing ones

// Add at the top of the DOMContentLoaded event
const matricule = urlParams.get('matricule');
let currentFiles = [];

// Add after loadAttachments call
setupFileUpload();

// Add these new functions:

function setupFileUpload() {
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
  }
}

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf') {
    showNotification('Veuillez sélectionner un fichier PDF', 'error');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showNotification('Le fichier est trop volumineux (max 10MB)', 'error');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('matricule', matricule);

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (response.ok) {
      showNotification('Fichier uploadé avec succès', 'success');
      event.target.value = ''; // Reset file input
      await loadAttachments(matricule); // Reload attachments
    } else {
      showNotification(result.error || 'Erreur lors de l\'upload', 'error');
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    showNotification('Erreur de connexion au serveur', 'error');
  }
}

async function deleteFile(fileId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/files/${fileId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      showNotification('Fichier supprimé avec succès', 'success');
      await loadAttachments(matricule);
    } else {
      const result = await response.json();
      showNotification(result.error || 'Erreur lors de la suppression', 'error');
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    showNotification('Erreur de connexion au serveur', 'error');
  }
}

// Update the displayAttachments function:
function displayAttachments(files) {
  const container = document.getElementById('attachmentsList');
  if (!container) return;
  
  currentFiles = files;

  if (files.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic; grid-column: 1 / -1;">Aucune pièce jointe</p>';
    return;
  }

  container.innerHTML = files.map(file => `
    <div class="attachment-item">
      <div class="attachment-preview" onclick="openAttachment('${file.filename}')">
        <div class="pdf-icon">📄</div>
        <div class="file-info">
          <div class="file-name">${file.original_name || file.filename}</div>
          <div class="file-date">${formatDate(file.uploaded_at)}</div>
        </div>
      </div>
      <button class="delete-file-btn" onclick="deleteFile(${file.id})" title="Supprimer le fichier">
        🗑️
      </button>
    </div>
  `).join('');
}

// Add back button function
function goBack() {
  window.history.back();
}

// Make deleteFile function global
window.deleteFile = deleteFile;