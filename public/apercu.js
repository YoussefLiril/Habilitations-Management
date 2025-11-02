// apercu.js
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:3000/api";
  let employees = [];
  let currentSort = { field: 'matricule', order: 'asc' };
  
  console.log('✅ apercu.js loaded successfully!');
  
  // Initialize the application
  init();

  async function init() {
    await loadEmployees();
    setupEventListeners();
    setupFilters();
  }

  // ===== EMPLOYEE DATA =====
  async function loadEmployees() {
    try {
      showLoading(true);
      console.log('📋 Loading employees from API...');
      const response = await fetch(`${API_BASE}/employees`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      employees = await response.json();
      console.log(`✅ Loaded ${employees.length} employees`);
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
      tbody.innerHTML = '<tr><td colspan="10" class="loading-message">Chargement des employés...</td></tr>';
    }
  }

  function renderTable(employeesToRender) {
    const tbody = document.querySelector("#employeesTable tbody");
    if (!tbody) {
      console.error('❌ Table body not found!');
      return;
    }
    
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

  // ===== FILTERS & SORTING =====
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

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[currentSort.field];
      let bVal = b[currentSort.field];
      
      if (currentSort.field === 'expiration' || currentSort.field === 'validation') {
        aVal = aVal ? new Date(aVal) : new Date(0);
        bVal = bVal ? new Date(bVal) : new Date(0);
      }
      
      if (currentSort.order === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    renderTable(filtered);
    updateEmployeeCount(filtered.length);
  }

  function toggleSort(field) {
    const button = document.getElementById(`sort${field.charAt(0).toUpperCase() + field.slice(1)}`);
    if (!button) return;

    // Update current sort
    if (currentSort.field === field) {
      currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort.field = field;
      currentSort.order = 'asc';
    }
    
    // Update button appearance
    document.querySelectorAll('.sort-controls button').forEach(btn => {
      btn.textContent = btn.textContent.replace(/[▲▼]/, '▲');
    });
    
    button.textContent = `${currentSort.order === 'asc' ? '▲' : '▼'} ${button.textContent.slice(2)}`;
    
    applyFilters();
  }

  // ===== EVENT LISTENERS =====
  function setupEventListeners() {
    // Legend toggle
    const toggleLegend = document.getElementById('toggleLegend');
    if (toggleLegend) {
      toggleLegend.addEventListener('click', toggleLegendVisibility);
      updateToggleButtonText();
    }

    // Legend color filters
    setupLegendFilters();
  }

  function setupLegendFilters() {
    const legendItems = document.querySelectorAll('.legend-item');
    let activeColors = [];

    legendItems.forEach(item => {
      item.addEventListener('click', () => {
        const color = item.getAttribute('data-color');
        const index = activeColors.indexOf(color);
        
        if (index > -1) {
          // Remove color from active filters
          activeColors.splice(index, 1);
          item.style.opacity = '1';
        } else {
          // Add color to active filters
          activeColors.push(color);
          item.style.opacity = '0.5';
        }
        
        applyColorFilters(activeColors);
      });
    });
  }

  function applyColorFilters(activeColors) {
    if (activeColors.length === 0) {
      applyFilters();
      return;
    }

    let filtered = employees.filter(emp => {
      const expirationColor = getExpirationColor(emp.expiration);
      return activeColors.includes(expirationColor);
    });

    renderTable(filtered);
    updateEmployeeCount(filtered.length);
  }

  function toggleLegendVisibility() {
    const legend = document.getElementById('legendBox');
    if (legend) {
      legend.classList.toggle('hidden');
      updateToggleButtonText();
    }
  }

  function updateToggleButtonText() {
    const toggleButton = document.getElementById('toggleLegend');
    const legend = document.getElementById('legendBox');
    
    if (toggleButton && legend) {
      if (legend.classList.contains('hidden')) {
        toggleButton.innerHTML = ' Afficher Légende';
      } else {
        toggleButton.innerHTML = ' Masquer Légende';
      }
    }
  }

  // ===== UTILITY FUNCTIONS =====
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