// gestion.js
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:3000/api";
  let currentEditMatricule = null;
  
  // Initialize the application
  init();

  function init() {
    setupEventListeners();
    checkEditMode();
  }

  function setupEventListeners() {
    // Form handling
    const employeeForm = document.getElementById('employeeForm');
    const clearFormBtn = document.getElementById('clearForm');
    
    if (employeeForm) {
      employeeForm.addEventListener('submit', handleFormSubmit);
    }
    
    if (clearFormBtn) {
      clearFormBtn.addEventListener('click', clearForm);
    }

    // Modal handling
    const cancelAction = document.getElementById('cancelAction');
    const confirmAction = document.getElementById('confirmAction');
    
    if (cancelAction) {
      cancelAction.addEventListener('click', hideModal);
    }
    
    if (confirmAction) {
      confirmAction.addEventListener('click', handleModalConfirm);
    }
  }

  function checkEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const editMatricule = urlParams.get('edit');
    
    if (editMatricule) {
      loadEmployeeForEdit(editMatricule);
    }
  }

  async function loadEmployeeForEdit(matricule) {
    try {
      showLoading(true);
      const response = await fetch(`${API_BASE}/employees/${matricule}`);
      
      if (!response.ok) {
        throw new Error('Employé non trouvé');
      }
      
      const employee = await response.json();
      populateForm(employee);
      currentEditMatricule = matricule;
      
      // Update UI for edit mode
      const submitBtn = document.querySelector('.btn-primary');
      const title = document.querySelector('h2');
      
      if (submitBtn) submitBtn.textContent = '💾 Modifier';
      if (title) title.textContent = 'Modifier un Employé';
      
      showNotification('Employé chargé pour modification', 'success');
    } catch (error) {
      console.error('Error loading employee for edit:', error);
      showNotification('Erreur lors du chargement des données', 'error');
    } finally {
      showLoading(false);
    }
  }

  function populateForm(employee) {
    // Basic information
    document.getElementById('matricule').value = employee.matricule;
    document.getElementById('nom').value = employee.nom;
    document.getElementById('prenom').value = employee.prenom;
    document.getElementById('division').value = employee.division || '';
    document.getElementById('service').value = employee.service || '';
    document.getElementById('section').value = employee.section || '';
    document.getElementById('equipe').value = employee.equipe || '';
    document.getElementById('fonction').value = employee.fonction || '';
    document.getElementById('numeroTitre').value = employee.titre || '';
    document.getElementById('dateValidation').value = employee.validation || '';
    document.getElementById('dateExpiration').value = employee.expiration || '';

    // Populate habilitations checkboxes
    const habilitations = JSON.parse(employee.habilitations || '[]');
    document.querySelectorAll('#habilitationsList input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = habilitations.includes(checkbox.value);
    });
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = getFormData();
    
    if (!validateForm(formData)) {
      return;
    }

    try {
      const url = currentEditMatricule ? 
        `${API_BASE}/employees/${currentEditMatricule}` : 
        `${API_BASE}/employees`;
      
      const method = currentEditMatricule ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        showNotification(
          currentEditMatricule ? 'Employé modifié avec succès' : 'Employé ajouté avec succès', 
          'success'
        );
        clearForm();
        
        // Redirect to overview after success
        setTimeout(() => {
          window.location.href = 'apercu.html';
        }, 1500);
      } else {
        showNotification(result.error || 'Erreur lors de la sauvegarde', 'error');
      }
    } catch (error) {
      console.error('Error saving employee:', error);
      showNotification('Erreur de connexion au serveur', 'error');
    }
  }

  function getFormData() {
    const habilitations = Array.from(document.querySelectorAll('#habilitationsList input:checked'))
      .map(cb => cb.value);

    return {
      matricule: document.getElementById("matricule").value,
      nom: document.getElementById("nom").value,
      prenom: document.getElementById("prenom").value,
      division: document.getElementById("division").value,
      service: document.getElementById("service").value,
      section: document.getElementById("section").value,
      equipe: document.getElementById("equipe").value,
      fonction: document.getElementById("fonction").value,
      habilitations: habilitations,
      titre: document.getElementById("numeroTitre").value,
      validation: document.getElementById("dateValidation").value,
      expiration: document.getElementById("dateExpiration").value
    };
  }

  function validateForm(data) {
    if (!data.matricule.trim()) {
      showNotification('Le matricule est obligatoire', 'error');
      document.getElementById('matricule').focus();
      return false;
    }
    if (!data.nom.trim()) {
      showNotification('Le nom est obligatoire', 'error');
      document.getElementById('nom').focus();
      return false;
    }
    if (!data.prenom.trim()) {
      showNotification('Le prénom est obligatoire', 'error');
      document.getElementById('prenom').focus();
      return false;
    }
    return true;
  }

  function clearForm() {
    const form = document.getElementById('employeeForm');
    if (form) {
      form.reset();
    }
    currentEditMatricule = null;
    
    // Reset UI to add mode
    const submitBtn = document.querySelector('.btn-primary');
    const title = document.querySelector('h2');
    
    if (submitBtn) submitBtn.textContent = '💾 Ajouter';
    if (title) title.textContent = 'Ajouter un Employé';
    
    showNotification('Formulaire réinitialisé', 'info');
  }

  function showLoading(loading) {
    const submitBtn = document.querySelector('.btn-primary');
    if (submitBtn) {
      if (loading) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Chargement...';
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = currentEditMatricule ? '💾 Modifier' : '💾 Ajouter';
      }
    }
  }

  // ===== MODAL FUNCTIONS =====
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

  function hideModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  function handleModalConfirm() {
    const modal = document.getElementById('confirmModal');
    if (modal && modal._confirmCallback) {
      modal._confirmCallback();
    }
    hideModal();
  }

  function showNotification(message, type = 'info') {
    // Remove existing notification
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