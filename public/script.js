// script.js
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:3000/api";
  let employees = [];
  let currentEditMatricule = null;
  
  // Initialize the application
  init();

  async function init() {
    setupEventListeners();
    await loadEmployees();
    setupFilters();
  }

  // ===== EVENT LISTENERS =====
  function setupEventListeners() {
    // Tab management
    document.getElementById('tab-overview').addEventListener('click', () => switchTab('overview'));
    document.getElementById('tab-manage').addEventListener('click', () => switchTab('manage'));

    // Form handling
    document.getElementById('employeeForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('clearForm').addEventListener('click', clearForm);

    // Modal handling
    document.getElementById('cancelAction')?.addEventListener('click', hideModal);
    document.getElementById('confirmAction')?.addEventListener('click', handleModalConfirm);

    // Legend
    document.getElementById('toggleLegend')?.addEventListener('click', toggleLegend);
  }

  // ===== TAB MANAGEMENT =====
  function switchTab(tabName) {
    // Update active tab button
    document.getElementById('tab-overview').classList.toggle('active', tabName === 'overview');
    document.getElementById('tab-manage').classList.toggle('active', tabName === 'manage');
    
    // Update active section
    document.getElementById('overview-section').classList.toggle('active', tabName === 'overview');
    document.getElementById('manage-section').classList.toggle('active', tabName === 'manage');
    
    if (tabName === 'overview') {
      loadEmployees();
    } else {
      clearForm();
    }
  }

  // ===== EMPLOYEE DATA =====
  async function loadEmployees() {
    try {
      showLoading(true);
      const response = await fetch(`${API_BASE}/employees`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      employees = await response.json();
      renderTable(employees);
      updateEmployeeCount(employees.length);
    } catch (error) {
      console.error('Error loading employees:', error);
      showNotification('Erreur lors du chargement des employés', 'error');
      renderTable([]);
    } finally {
      showLoading(false);
    }
  }

  function showLoading(loading) {
    const tbody = document.querySelector("#employeesTable tbody");
    if (loading && tbody) {
      tbody.innerHTML = '<tr><td colspan="10" class="loading-message">Chargement...</td></tr>';
    }
  }

  function renderTable(employeesToRender) {
    const tbody = document.querySelector("#employeesTable tbody");
    if (!tbody) return;
    
    if (employeesToRender.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="no-data">Aucun employé trouvé</td></tr>';
      return;
    }

    tbody.innerHTML = employeesToRender.map(emp => {
      const habilitations = JSON.parse(emp.habilitations || '[]');
      const expirationColor = getExpirationColor(emp.expiration);
      
      return `
        <tr data-matricule="${emp.matricule}">
          <td>${emp.matricule}</td>
          <td>${emp.nom}</td>
          <td>${emp.prenom}</td>
          <td>${emp.division || '-'}</td>
          <td>${emp.service || '-'}</td>
          <td>${emp.section || '-'}</td>
          <td>${emp.equipe || '-'}</td>
          <td>${habilitations.join(', ') || '-'}</td>
          <td>${formatDate(emp.validation)}</td>
          <td class="${expirationColor}">${formatDate(emp.expiration)}</td>
        </tr>
      `;
    }).join('');

    // Add click events to rows
    tbody.querySelectorAll('tr[data-matricule]').forEach(tr => {
      tr.addEventListener('click', () => {
        const matricule = tr.getAttribute('data-matricule');
        window.location.href = `details.html?matricule=${matricule}`;
      });
    });
  }

  function updateEmployeeCount(count) {
    const counterElement = document.getElementById('employeeCount');
    if (counterElement) {
      counterElement.textContent = `${count} employé(s) trouvé(s)`;
    }
  }

  // ===== FORM HANDLING =====
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
        switchTab('overview');
        await loadEmployees();
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
      return false;
    }
    if (!data.nom.trim()) {
      showNotification('Le nom est obligatoire', 'error');
      return false;
    }
    if (!data.prenom.trim()) {
      showNotification('Le prénom est obligatoire', 'error');
      return false;
    }
    return true;
  }

  function clearForm() {
    document.getElementById('employeeForm').reset();
    currentEditMatricule = null;
    const submitBtn = document.querySelector('.btn-primary');
    if (submitBtn) submitBtn.textContent = '💾 Ajouter';
    const title = document.querySelector('#manage-section h2');
    if (title) title.textContent = 'Ajouter un Employé';
  }

  // ===== FILTERS =====
  function setupFilters() {
    // Real-time search
    const searchInput = document.getElementById('searchMatricule');
    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }
    
    // Dropdown filters
    ['filterDivision', 'filterEquipe', 'filterHabilitation'].forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', applyFilters);
      }
    });

    // Sorting
    const sortMatricule = document.getElementById('sortMatricule');
    const sortExpiration = document.getElementById('sortExpiration');
    
    if (sortMatricule) sortMatricule.addEventListener('click', () => toggleSort('matricule'));
    if (sortExpiration) sortExpiration.addEventListener('click', () => toggleSort('expiration'));
  }

  function applyFilters() {
    const searchMatricule = document.getElementById('searchMatricule')?.value.toLowerCase() || '';
    const filterDivision = document.getElementById('filterDivision')?.value || '';
    const filterEquipe = document.getElementById('filterEquipe')?.value || '';
    const habilitationSelect = document.getElementById('filterHabilitation');
    const selectedHabilitations = habilitationSelect ? 
      Array.from(habilitationSelect.selectedOptions).map(option => option.value) : [];

    let filtered = employees.filter(emp => {
      const matchesMatricule = !searchMatricule || 
        emp.matricule.toLowerCase().includes(searchMatricule);
      const matchesDivision = !filterDivision || emp.division === filterDivision;
      const matchesEquipe = !filterEquipe || emp.equipe === filterEquipe;
      
      const empHabilitations = JSON.parse(emp.habilitations || '[]');
      const matchesHabilitation = selectedHabilitations.length === 0 || 
        selectedHabilitations.some(h => empHabilitations.includes(h));
      
      return matchesMatricule && matchesDivision && matchesEquipe && matchesHabilitation;
    });

    renderTable(filtered);
    updateEmployeeCount(filtered.length);
  }

  function toggleSort(field) {
    const button = document.getElementById(`sort${field.charAt(0).toUpperCase() + field.slice(1)}`);
    if (!button) return;

    const currentOrder = button.getAttribute('data-order');
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    
    // Reset other sort buttons
    document.querySelectorAll('.sort-controls button').forEach(btn => {
      if (btn !== button) {
        btn.setAttribute('data-order', 'asc');
        btn.textContent = `▲ ${btn.textContent.slice(2)}`;
      }
    });
    
    button.setAttribute('data-order', newOrder);
    button.textContent = `${newOrder === 'asc' ? '▲' : '▼'} ${button.textContent.slice(2)}`;
    
    applyFilters();
  }

  // ===== UTILITY FUNCTIONS =====
  function getExpirationColor(expirationDate) {
    if (!expirationDate) return 'gray';
    
    const today = new Date();
    const exp = new Date(expirationDate);
    const diffMonths = (exp - today) / (1000 * 60 * 60 * 24 * 30);
    
    if (diffMonths > 6) return "green";
    if (diffMonths > 3) return "yellow";
    if (diffMonths > 1) return "orange";
    if (diffMonths > 0) return "red";
    return "purple";
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  function toggleLegend() {
    const legend = document.getElementById('legendBox');
    if (legend) {
      legend.classList.toggle('hidden');
    }
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

  // Modal functions (for compatibility)
  function showModal(message, confirmCallback) {
    console.log('Modal:', message);
    // Simple confirmation for now
    if (confirm(message)) {
      confirmCallback();
    }
  }

  function hideModal() {
    // Modal handling for details page
  }

  function handleModalConfirm() {
    // Modal handling for details page
  }
});