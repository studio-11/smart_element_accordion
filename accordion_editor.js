(function () {
  'use strict';

  // ==========================================
  // CONFIGURATION
  // ==========================================
  const API_URL = 'https://learningsphere.ifen.lu/ifen_html/smart_elements/accordion/accordion_api.php';
  const PERMISSIONS_API_URL = 'https://learningsphere.ifen.lu/ifen_html/api/user_permissions_api.php';
  
  // Cache pour les permissions utilisateur
  let userPermissionsCache = null;
  
  // Accordéons actuellement édités
  const editedAccordions = new Map();

  // ==========================================
  // PERMISSIONS
  // ==========================================
  
  /**
   * Charger les permissions utilisateur (avec cache)
   */
  async function loadUserPermissions(courseid) {
    if (userPermissionsCache !== null) {
      console.log('accordion: Permissions déjà en cache:', userPermissionsCache.primaryRole);
      return userPermissionsCache;
    }
    
    try {
      console.log('accordion: Chargement des permissions utilisateur...');
      const response = await fetch(`${PERMISSIONS_API_URL}?courseid=${courseid}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur inconnue');
      }
      
      userPermissionsCache = data;
      console.log('accordion: Permissions chargées - Rôle:', data.primaryRole, '- canEdit:', data.permissions.canEdit);
      
      return data;
    } catch (error) {
      console.error('accordion: Erreur lors du chargement des permissions:', error);
      return null;
    }
  }

  /**
   * Récupérer le Course ID depuis l'URL
   */
  function getCourseId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || null;
  }

  // ==========================================
  // API CALLS
  // ==========================================

  /**
   * Charger les items d'un accordéon
   */
  async function loadAccordionItems(courseid, accordionid) {
    try {
      const response = await fetch(`${API_URL}?courseid=${courseid}&accordionid=${accordionid}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur inconnue');
      }
      
      return data;
    } catch (error) {
      console.error('accordion: Erreur lors du chargement des items:', error);
      return null;
    }
  }

  /**
   * Sauvegarder un item
   */
  async function saveAccordionItem(courseid, accordionid, itemData) {
    try {
      const formData = new FormData();
      formData.append('action', 'SAVE_ITEM');
      formData.append('courseid', courseid);
      formData.append('accordionid', accordionid);
      formData.append('itemId', itemData.id || 0);
      formData.append('title', itemData.title);
      formData.append('content', itemData.content);
      formData.append('isExpanded', itemData.isExpanded ? 1 : 0);
      formData.append('headingId', itemData.headingId || '');
      formData.append('collapseId', itemData.collapseId || '');
      formData.append('itemOrder', itemData.order || 0);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur inconnue');
      }
      
      return data;
    } catch (error) {
      console.error('accordion: Erreur lors de la sauvegarde:', error);
      return null;
    }
  }

  /**
   * Supprimer un item
   */
  async function deleteAccordionItem(itemId) {
    try {
      const formData = new FormData();
      formData.append('action', 'DELETE_ITEM');
      formData.append('itemId', itemId);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur inconnue');
      }
      
      return data;
    } catch (error) {
      console.error('accordion: Erreur lors de la suppression:', error);
      return null;
    }
  }

  // ==========================================
  // STYLES CSS
  // ==========================================

  function injectStyles() {
    if (document.getElementById('accordion-editor-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'accordion-editor-styles';
    style.textContent = `
      /* ===== ACCORDÉON ÉDITABLE - STYLE IFEN ===== */
      
      /* Font IFEN */
      .accordion-editable,
      .accordion-editable * {
        font-family: 'Barlow Semi Condensed', sans-serif !important;
      }
      
      /* Container éditable */
      .accordion-editable {
        position: relative;
        margin-bottom: 30px;
      }
      
      /* Badge "Mode édition" - Style IFEN */
      .accordion-edit-badge {
        display: none;
        background: linear-gradient(135deg, #00b2bb 0%, #1F154d 100%);
        color: white;
        padding: 8px 16px;
        border-radius: 15px;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 15px;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0, 178, 187, 0.3);
      }
      
      .accordion-editable.can-edit .accordion-edit-badge {
        display: block;
      }
      
      /* Badge informatif pour admins/managers - Style IFEN */
      .accordion-info-badge {
        margin-bottom: 20px;
        background-image: url('https://lms.ifen.lu/ifen_images/Fond_pastel_transverse.jpg');
        background-size: cover;
        background-position: center;
        border-left: 4px solid #00b2bb;
        border-radius: 15px;
        box-shadow: 0 2px 8px rgba(31, 21, 77, 0.15);
      }
      
      .accordion-info-content {
        display: flex;
        align-items: flex-start;
        padding: 20px;
      }
      
      .accordion-info-icon {
        font-size: 28px;
        margin-right: 15px;
        flex-shrink: 0;
      }
      
      .accordion-info-text {
        flex: 1;
        line-height: 1.6;
      }
      
      .accordion-info-text strong {
        color: #1F154d;
        font-size: 16px;
        font-weight: 600;
      }
      
      .accordion-info-details {
        display: block;
        margin-top: 8px;
        font-size: 14px;
        color: #333;
      }
      
      .accordion-info-details strong {
        color: #00b2bb;
        font-size: 14px;
        font-weight: 600;
      }
      
      /* Message "Accordéon vide" - Style IFEN */
      .accordion-empty-message {
        margin: 20px 0;
        background-image: url('https://lms.ifen.lu/ifen_images/Fond_pastel_transverse.jpg');
        background-size: cover;
        background-position: center;
        border-left: 4px solid #00b2bb;
        border-radius: 15px;
        box-shadow: 0 2px 8px rgba(31, 21, 77, 0.15);
      }
      
      .accordion-empty-content {
        display: flex;
        align-items: center;
        padding: 30px;
        justify-content: center;
      }
      
      .accordion-empty-icon {
        font-size: 56px;
        margin-right: 25px;
        opacity: 0.6;
      }
      
      .accordion-empty-text {
        text-align: left;
        line-height: 1.8;
      }
      
      .accordion-empty-text strong {
        color: #1F154d;
        font-size: 20px;
        font-weight: 600;
        display: block;
        margin-bottom: 10px;
      }
      
      .accordion-empty-details {
        display: block;
        font-size: 15px;
        color: #333;
      }
      
      /* Items de l'accordéon - Style IFEN */
      .accordion-item {
        border: none !important;
        margin-bottom: 12px;
        border-radius: 15px !important;
        overflow: hidden;
        box-shadow: 0 2px 6px rgba(31, 21, 77, 0.1);
      }
      
      /* En-tête des items - Style IFEN avec background */
      .accordion-header {
        margin-bottom: 0;
      }
      
      .accordion-button {
        background-image: url('https://lms.ifen.lu/ifen_images/bande_motif_ifen_transverse.jpg') !important;
        background-size: cover !important;
        background-position: center !important;
        color: #1F154d !important;
        font-size: 18px !important;
        font-weight: 600 !important;
        padding: 18px 20px !important;
        border: none !important;
        border-radius: 15px !important;
        transition: all 0.3s ease;
      }
      
      .accordion-button:not(.collapsed) {
        background-image: url('https://lms.ifen.lu/ifen_images/bande_motif_ifen_transverse.jpg') !important;
        color: #1F154d !important;
        box-shadow: none !important;
        border-bottom-left-radius: 0 !important;
        border-bottom-right-radius: 0 !important;
      }
      
      .accordion-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 178, 187, 0.2);
      }
      
      .accordion-button:focus {
        box-shadow: 0 0 0 3px rgba(0, 178, 187, 0.25) !important;
        border-color: #00b2bb !important;
      }
      
      .accordion-button::after {
        background-image: none !important;
        content: "▼" !important;
        font-size: 14px;
        color: #1F154d;
        transform: rotate(0deg);
        transition: transform 0.3s ease;
      }
      
      .accordion-button:not(.collapsed)::after {
        transform: rotate(180deg);
      }
      
      /* Corps des items */
      .accordion-body {
        padding: 20px !important;
        background-color: #fff !important;
        color: #333 !important;
        font-size: 15px !important;
        line-height: 1.6 !important;
        border-radius: 0 0 15px 15px !important;
      }
      
      /* Boutons d'action sur chaque card - Style IFEN */
      .accordion-item-actions {
        display: none;
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 10;
        gap: 6px;
      }
      
      .accordion-editable.can-edit .accordion-item-actions {
        display: flex;
      }
      
      .accordion-action-btn {
        background: linear-gradient(135deg, #00b2bb 0%, #1F154d 100%);
        color: white;
        border: none;
        border-radius: 10px;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.2s;
        box-shadow: 0 2px 6px rgba(0, 178, 187, 0.25);
      }
      
      .accordion-action-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(0, 178, 187, 0.4);
      }
      
      .accordion-action-btn.delete {
        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
      }
      
      .accordion-action-btn.delete:hover {
        box-shadow: 0 4px 10px rgba(220, 53, 69, 0.4);
      }
      
      /* Bouton "Ajouter un item" - Style IFEN */
      .accordion-add-item-btn {
        display: none;
        width: 100%;
        margin-top: 15px;
        padding: 15px 20px;
        background: linear-gradient(135deg, #00b2bb 0%, #1F154d 100%);
        color: white;
        border: none;
        border-radius: 15px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 178, 187, 0.3);
      }
      
      .accordion-editable.can-edit .accordion-add-item-btn {
        display: block;
      }
      
      .accordion-add-item-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 178, 187, 0.4);
      }
      
      /* Modal d'édition - Style IFEN */
      .accordion-edit-modal {
        display: none;
        position: fixed;
        z-index: 9999;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(31, 21, 77, 0.7);
        backdrop-filter: blur(4px);
      }
      
      .accordion-edit-modal-content {
        background-image: url('https://lms.ifen.lu/ifen_images/Fond_pastel_transverse.jpg');
        background-size: cover;
        background-position: center;
        margin: 3% auto;
        padding: 0;
        border: none;
        border-radius: 20px;
        width: 90%;
        max-width: 800px;
        max-height: 85vh;
        overflow: hidden;
        box-shadow: 0 10px 40px rgba(31, 21, 77, 0.3);
        display: flex;
        flex-direction: column;
      }
      
      .accordion-edit-modal-header {
        background: linear-gradient(135deg, #00b2bb 0%, #1F154d 100%);
        color: white;
        padding: 20px 25px;
        font-size: 22px;
        font-weight: 600;
        flex-shrink: 0;
      }
      
      .accordion-edit-modal-body {
        padding: 25px;
        overflow-y: auto;
        flex: 1;
        background-color: rgba(255, 255, 255, 0.95);
      }
      
      .accordion-edit-form-group {
        margin-bottom: 20px;
      }
      
      .accordion-edit-form-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #1F154d;
        font-size: 15px;
      }
      
      .accordion-edit-form-group input[type="text"] {
        width: 100%;
        padding: 12px;
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        font-size: 15px;
        box-sizing: border-box;
        transition: border-color 0.2s ease;
      }
      
      .accordion-edit-form-group input[type="text"]:focus {
        outline: none;
        border-color: #00b2bb;
        box-shadow: 0 0 0 3px rgba(0, 178, 187, 0.1);
      }
      
      .accordion-edit-form-group textarea {
        width: 100%;
        min-height: 200px;
        padding: 12px;
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        font-size: 15px;
        font-family: 'Barlow Semi Condensed', sans-serif;
        resize: vertical;
        box-sizing: border-box;
        transition: border-color 0.2s ease;
      }
      
      .accordion-edit-form-group textarea:focus {
        outline: none;
        border-color: #00b2bb;
        box-shadow: 0 0 0 3px rgba(0, 178, 187, 0.1);
      }
      
      .accordion-edit-form-group input[type="checkbox"] {
        width: 20px;
        height: 20px;
        margin-right: 10px;
        cursor: pointer;
        accent-color: #00b2bb;
      }
      
      .accordion-edit-modal-buttons {
        padding: 20px 25px;
        text-align: right;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        background-color: rgba(255, 255, 255, 0.95);
        border-top: 2px solid rgba(31, 21, 77, 0.1);
        flex-shrink: 0;
      }
      
      .accordion-edit-modal-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        font-size: 15px;
        font-weight: 600;
        transition: all 0.2s ease;
      }
      
      .accordion-edit-modal-btn-save {
        background: linear-gradient(135deg, #00b2bb 0%, #1F154d 100%);
        color: white;
      }
      
      .accordion-edit-modal-btn-save:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 178, 187, 0.3);
      }
      
      .accordion-edit-modal-btn-cancel {
        background: #e0e0e0;
        color: #333;
      }
      
      .accordion-edit-modal-btn-cancel:hover {
        background: #d0d0d0;
      }
      
      /* Highlight sur hover en mode édition */
      .accordion-editable.can-edit .accordion-item:hover {
        box-shadow: 0 4px 12px rgba(0, 178, 187, 0.25);
      }
    `;
    document.head.appendChild(style);
  }

  // ==========================================
  // MODAL D'ÉDITION
  // ==========================================

  /**
   * Afficher le modal d'édition
   */
  function showEditModal(accordionid, courseid, itemData = null) {
    let modal = document.getElementById('accordion-edit-modal');
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'accordion-edit-modal';
      modal.className = 'accordion-edit-modal';
      modal.innerHTML = `
        <div class="accordion-edit-modal-content">
          <div class="accordion-edit-modal-header">${itemData ? 'Modifier' : 'Ajouter'} un item</div>
          <form id="accordion-edit-form">
            <div class="accordion-edit-form-group">
              <label for="accordion-edit-title">Titre du drawer:</label>
              <input type="text" id="accordion-edit-title" required>
            </div>
            <div class="accordion-edit-form-group">
              <label for="accordion-edit-content">Contenu (HTML autorisé):</label>
              <textarea id="accordion-edit-content" required></textarea>
            </div>
            <div class="accordion-edit-form-group">
              <label>
                <input type="checkbox" id="accordion-edit-expanded">
                Ouvert par défaut
              </label>
            </div>
          </form>
          <div class="accordion-edit-modal-buttons">
            <button class="accordion-edit-modal-btn accordion-edit-modal-btn-cancel" id="accordion-edit-cancel">Annuler</button>
            <button class="accordion-edit-modal-btn accordion-edit-modal-btn-save" id="accordion-edit-save">Enregistrer</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Fermer en cliquant sur le fond
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
      
      // Bouton annuler
      document.getElementById('accordion-edit-cancel').addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }
    
    // Pré-remplir les champs
    document.getElementById('accordion-edit-title').value = itemData?.title || '';
    document.getElementById('accordion-edit-content').value = itemData?.content || '';
    document.getElementById('accordion-edit-expanded').checked = itemData?.isExpanded || false;
    
    // Afficher le modal
    modal.style.display = 'block';
    document.getElementById('accordion-edit-title').focus();
    
    // Handler de sauvegarde
    const saveBtn = document.getElementById('accordion-edit-save');
    saveBtn.onclick = async () => {
      const title = document.getElementById('accordion-edit-title').value.trim();
      const content = document.getElementById('accordion-edit-content').value.trim();
      const isExpanded = document.getElementById('accordion-edit-expanded').checked;
      
      if (!title || !content) {
        alert('Le titre et le contenu sont obligatoires');
        return;
      }
      
      const dataToSave = {
        id: itemData?.id || 0,
        title: title,
        content: content,
        isExpanded: isExpanded,
        headingId: itemData?.headingId || '',
        collapseId: itemData?.collapseId || '',
        order: itemData?.order || 0
      };
      
      const result = await saveAccordionItem(courseid, accordionid, dataToSave);
      
      if (result && result.success) {
        modal.style.display = 'none';
        // Recharger l'accordéon
        await refreshAccordion(accordionid, courseid);
        console.log('accordion: Item sauvegardé avec succès');
      } else {
        alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
      }
    };
  }

  // ==========================================
  // GESTION DES ITEMS
  // ==========================================

  /**
   * Créer le HTML d'un item
   */
  function createItemHTML(item, accordionid, isFirst) {
    const headingId = item.headingId;
    const collapseId = item.collapseId;
    const showClass = isFirst || item.isExpanded ? 'show' : '';
    const ariaExpanded = isFirst || item.isExpanded ? 'true' : 'false';
    const collapsedClass = (isFirst || item.isExpanded) ? '' : 'collapsed';
    
    return `
      <div class="card" data-item-id="${item.id}">
        <div class="card-header" id="${headingId}">
          <h2 class="mb-0">
            <a class="btn btn-link btn-block text-left ${collapsedClass}" 
               type="button" 
               data-toggle="collapse" 
               data-target="#${collapseId}" 
               aria-expanded="${ariaExpanded}" 
               aria-controls="${collapseId}">
              ${item.title}
            </a>
          </h2>
          <div class="accordion-item-actions">
            <button class="accordion-action-btn edit" data-action="edit" title="Modifier">
              ✏️
            </button>
            <button class="accordion-action-btn delete" data-action="delete" title="Supprimer">
              🗑️
            </button>
          </div>
        </div>
        <div id="${collapseId}" 
             class="collapse ${showClass}" 
             aria-labelledby="${headingId}" 
             data-parent="#${accordionid}">
          <div class="card-body">
            ${item.content}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Rafraîchir un accordéon
   */
  async function refreshAccordion(accordionid, courseid) {
    const accordion = document.getElementById(accordionid);
    if (!accordion) return;
    
    console.log('accordion: refreshAccordion appelé pour', accordionid);
    
    // Charger les items depuis la BDD
    const data = await loadAccordionItems(courseid, accordionid);
    
    if (!data || !data.success) {
      console.error('accordion: Erreur lors du chargement');
      return;
    }
    
    const items = data.items || [];
    console.log('accordion: Nombre d\'items chargés:', items.length);
    
    // Sauvegarder les éléments AVANT de vider (important: les retirer du DOM)
    const addBtn = accordion.querySelector('.accordion-add-item-btn');
    const editBadge = accordion.querySelector('.accordion-edit-badge');
    const infoBadge = accordion.querySelector('.accordion-info-badge');
    
    // Les retirer du DOM pour les préserver
    if (addBtn) addBtn.remove();
    if (editBadge) editBadge.remove();
    if (infoBadge) infoBadge.remove();
    
    console.log('accordion: Éléments sauvegardés - addBtn:', !!addBtn, 'editBadge:', !!editBadge, 'infoBadge:', !!infoBadge);
    
    // Vérifier si on peut éditer
    const canEdit = accordion.classList.contains('can-edit');
    console.log('accordion: canEdit =', canEdit);
    
    // Maintenant vider l'accordéon (ne supprimera pas les éléments retirés)
    accordion.innerHTML = '';
    
    // Remettre le badge "Mode édition" s'il existait
    if (editBadge) {
      accordion.appendChild(editBadge);
    }
    
    // Remettre le badge info s'il existait
    if (infoBadge) {
      accordion.appendChild(infoBadge);
    }
    
    // Si l'accordéon est vide
    if (items.length === 0) {
      console.log('accordion: Accordéon vide détecté');
      
      // Afficher un message pour les non-éditeurs qui ont le badge info
      if (!canEdit && infoBadge) {
        console.log('accordion: Création du message "accordéon vide"');
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'accordion-empty-message';
        emptyMsg.innerHTML = `
          <div class="accordion-empty-content">
            <span class="accordion-empty-icon">📭</span>
            <div class="accordion-empty-text">
              <strong>Accordéon vide</strong><br>
              <span class="accordion-empty-details">
                Cet accordéon ne contient pas encore de contenu.<br>
                Un enseignant éditeur doit d'abord créer des sections.
              </span>
            </div>
          </div>
        `;
        accordion.appendChild(emptyMsg);
        console.log('accordion: Message "accordéon vide" ajouté au DOM');
      } else {
        console.log('accordion: Message vide NON affiché - canEdit:', canEdit, 'infoBadge:', !!infoBadge);
      }
    } else {
      // Recréer les items
      items.forEach((item, index) => {
        const itemHTML = createItemHTML(item, accordionid, index === 0);
        const temp = document.createElement('div');
        temp.innerHTML = itemHTML;
        accordion.appendChild(temp.firstElementChild);
      });
      
      // Attacher les événements
      attachItemEvents(accordion, accordionid, courseid);
    }
    
    // Remettre le bouton d'ajout s'il existait
    if (addBtn) {
      accordion.appendChild(addBtn);
    }
    
    console.log('accordion: Accordéon rafraîchi -', items.length, 'items');
  }

  /**
   * Attacher les événements aux boutons d'action
   */
  function attachItemEvents(accordion, accordionid, courseid) {
    const cards = accordion.querySelectorAll('.card[data-item-id]');
    
    cards.forEach(card => {
      const itemId = parseInt(card.dataset.itemId);
      
      // Bouton éditer
      const editBtn = card.querySelector('[data-action="edit"]');
      if (editBtn) {
        editBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Charger les données de l'item
          const data = await loadAccordionItems(courseid, accordionid);
          if (data && data.success) {
            const item = data.items.find(i => i.id === itemId);
            if (item) {
              showEditModal(accordionid, courseid, item);
            }
          }
        });
      }
      
      // Bouton supprimer
      const deleteBtn = card.querySelector('[data-action="delete"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          if (!confirm('Êtes-vous sûr de vouloir supprimer cet item ?')) {
            return;
          }
          
          const result = await deleteAccordionItem(itemId);
          
          if (result && result.success) {
            await refreshAccordion(accordionid, courseid);
            console.log('accordion: Item supprimé');
          } else {
            alert('Erreur lors de la suppression');
          }
        });
      }
    });
  }

  // ==========================================
  // INITIALISATION
  // ==========================================

  /**
   * Initialiser un accordéon
   */
  async function initAccordion(accordion) {
    const accordionid = accordion.id;
    if (!accordionid) {
      console.warn('accordion: Accordéon sans ID trouvé');
      return;
    }
    
    // Éviter double initialisation
    if (editedAccordions.has(accordionid)) {
      console.log('accordion: Déjà initialisé:', accordionid);
      return;
    }
    
    const courseid = getCourseId();
    if (!courseid) {
      console.warn('accordion: Course ID introuvable');
      return;
    }
    
    console.log('accordion: Initialisation de', accordionid);
    
    // Charger les permissions
    const perms = await loadUserPermissions(courseid);
    const canEdit = perms?.permissions?.canEdit || false;
    
    console.log('accordion: canEdit =', canEdit);
    
    // Ajouter les classes et éléments d'édition
    accordion.classList.add('accordion-editable');
    
    if (canEdit) {
      accordion.classList.add('can-edit');
      
      // Badge "Mode édition"
      if (!accordion.querySelector('.accordion-edit-badge')) {
        const badge = document.createElement('div');
        badge.className = 'accordion-edit-badge';
        badge.textContent = '✏️ Mode édition activé';
        accordion.insertBefore(badge, accordion.firstChild);
      }
      
      // Bouton "Ajouter un item"
      if (!accordion.querySelector('.accordion-add-item-btn')) {
        const addBtn = document.createElement('button');
        addBtn.className = 'accordion-add-item-btn';
        addBtn.textContent = '+ Ajouter un item';
        addBtn.addEventListener('click', () => {
          showEditModal(accordionid, courseid, null);
        });
        accordion.appendChild(addBtn);
      }
      
      // Charger les items depuis la BDD et rafraîchir
      await refreshAccordion(accordionid, courseid);
    } else {
      // Utilisateur ne peut pas éditer
      // Vérifier si c'est un admin/manager ou un étudiant
      const userRole = perms?.primaryRole || 'other';
      
      if (userRole !== 'student') {
        // C'est un admin, manager ou autre rôle (pas étudiant, pas editing teacher)
        // Afficher un message informatif
        if (!accordion.querySelector('.accordion-info-badge')) {
          const infoBadge = document.createElement('div');
          infoBadge.className = 'accordion-info-badge';
          infoBadge.innerHTML = `
            <div class="accordion-info-content">
              <span class="accordion-info-icon">ℹ️</span>
              <div class="accordion-info-text">
                <strong>Smart Element : Accordéon éditable</strong><br>
                <span class="accordion-info-details">
                  Cet accordéon peut être modifié par les <strong>enseignants éditeurs</strong> (editing teachers).<br>
                  Vous voyez actuellement le contenu par défaut. Les enseignants peuvent ajouter, modifier et supprimer les sections.
                </span>
              </div>
            </div>
          `;
          accordion.insertBefore(infoBadge, accordion.firstChild);
        }
      }
      
      // Pour tous les non-éditeurs (y compris étudiants), charger le contenu depuis la BDD
      await refreshAccordion(accordionid, courseid);
    }
    
    // Marquer comme initialisé
    editedAccordions.set(accordionid, {
      courseid,
      canEdit
    });
  }

  /**
   * Initialiser tous les accordéons
   */
  async function init() {
    injectStyles();
    
    const accordions = document.querySelectorAll('.accordion[id^="accordion-"]');
    console.log('accordion: Trouvé', accordions.length, 'accordéon(s)');
    
    for (const accordion of accordions) {
      await initAccordion(accordion);
    }
  }

  // ==========================================
  // DÉMARRAGE
  // ==========================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(init, 300);
    });
  } else {
    setTimeout(init, 300);
  }

})();