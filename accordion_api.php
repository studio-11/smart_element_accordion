<?php
/**
 * API pour gérer les accordéons éditables
 * Version 1.0
 * 
 * Emplacement: /export/hosting/men/ifen/htdocs-learningsphere/ifen_html/activity_element/accordion_api.php
 * URL: https://learningsphere.ifen.lu/ifen_html/activity_element/accordion_api.php
 * 
 * Actions:
 * - GET: Récupérer tous les items d'un accordéon
 * - SAVE_ITEM: Sauvegarder/mettre à jour un item
 * - DELETE_ITEM: Supprimer un item
 * - REORDER: Réordonner les items
 */

header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');

// Configuration de la base de données
$db_config = [
    'host' => 'mysql.restena.lu',
    'db' => 'ifenlmsmain1db',
    'user' => 'ifen',
    'pass' => '5Qmeytvw9JTyNMnL'
];

try {
    // Connexion MySQL
    $mysqli = new mysqli(
        $db_config['host'],
        $db_config['user'],
        $db_config['pass'],
        $db_config['db']
    );
    
    if ($mysqli->connect_error) {
        throw new Exception('Connexion DB échouée: ' . $mysqli->connect_error);
    }
    
    $mysqli->set_charset('utf8mb4');
    
    // Récupérer l'ID utilisateur depuis la session Moodle
    $userid = null;
    
    if (isset($_COOKIE['MoodleSession'])) {
        $sessionid = $_COOKIE['MoodleSession'];
        
        $stmt = $mysqli->prepare("
            SELECT userid 
            FROM mdl_sessions 
            WHERE sid = ? 
            AND state = 0
            LIMIT 1
        ");
        $stmt->bind_param('s', $sessionid);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            $userid = $row['userid'];
        }
        $stmt->close();
    }
    
    if (!$userid) {
        echo json_encode([
            'success' => false,
            'error' => 'Utilisateur non connecté'
        ]);
        exit;
    }
    
    // Déterminer l'action
    $action = $_SERVER['REQUEST_METHOD'] === 'POST' 
        ? ($_POST['action'] ?? 'SAVE_ITEM') 
        : 'GET';
    
    // ============================================
    // ACTION: GET - Récupérer tous les items
    // ============================================
    if ($action === 'GET') {
        $courseid = isset($_GET['courseid']) ? intval($_GET['courseid']) : 0;
        $accordionid = isset($_GET['accordionid']) ? trim($_GET['accordionid']) : '';
        
        if (!$courseid || !$accordionid) {
            echo json_encode([
                'success' => false,
                'error' => 'courseid ou accordionid manquant'
            ]);
            exit;
        }
        
        // Vérifier si l'instance d'accordéon existe
        $stmt = $mysqli->prepare("
            SELECT id, title, created_at, updated_at
            FROM mdl_accordion_instances
            WHERE courseid = ?
            AND accordionid = ?
            LIMIT 1
        ");
        $stmt->bind_param('is', $courseid, $accordionid);
        $stmt->execute();
        $result = $stmt->get_result();
        $instance = $result->fetch_assoc();
        $stmt->close();
        
        if (!$instance) {
            // Pas d'instance trouvée, retourner un tableau vide
            echo json_encode([
                'success' => true,
                'items' => [],
                'accordion_title' => null,
                'message' => 'Nouvel accordéon'
            ]);
            exit;
        }
        
        // Récupérer tous les items
        $stmt = $mysqli->prepare("
            SELECT 
                id,
                item_order,
                heading_id,
                collapse_id,
                title,
                content,
                is_expanded,
                created_at,
                updated_at
            FROM mdl_accordion_items
            WHERE accordion_instance_id = ?
            ORDER BY item_order ASC
        ");
        $stmt->bind_param('i', $instance['id']);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = [
                'id' => intval($row['id']),
                'order' => intval($row['item_order']),
                'headingId' => $row['heading_id'],
                'collapseId' => $row['collapse_id'],
                'title' => $row['title'],
                'content' => $row['content'],
                'isExpanded' => (bool)$row['is_expanded'],
                'createdAt' => intval($row['created_at']),
                'updatedAt' => $row['updated_at'] ? intval($row['updated_at']) : null
            ];
        }
        $stmt->close();
        
        echo json_encode([
            'success' => true,
            'items' => $items,
            'accordion_title' => $instance['title'],
            'total_items' => count($items)
        ]);
        exit;
    }
    
    // ============================================
    // ACTION: SAVE_ITEM - Sauvegarder un item
    // ============================================
    if ($action === 'SAVE_ITEM') {
        $courseid = isset($_POST['courseid']) ? intval($_POST['courseid']) : 0;
        $accordionid = isset($_POST['accordionid']) ? trim($_POST['accordionid']) : '';
        $itemId = isset($_POST['itemId']) ? intval($_POST['itemId']) : 0;
        $title = isset($_POST['title']) ? trim($_POST['title']) : '';
        $content = isset($_POST['content']) ? trim($_POST['content']) : '';
        $isExpanded = isset($_POST['isExpanded']) ? intval($_POST['isExpanded']) : 0;
        $headingId = isset($_POST['headingId']) ? trim($_POST['headingId']) : '';
        $collapseId = isset($_POST['collapseId']) ? trim($_POST['collapseId']) : '';
        $itemOrder = isset($_POST['itemOrder']) ? intval($_POST['itemOrder']) : 0;
        
        if (!$courseid || !$accordionid || !$title) {
            echo json_encode([
                'success' => false,
                'error' => 'Paramètres manquants'
            ]);
            exit;
        }
        
        // Créer ou récupérer l'instance d'accordéon
        $stmt = $mysqli->prepare("
            SELECT id
            FROM mdl_accordion_instances
            WHERE courseid = ?
            AND accordionid = ?
            LIMIT 1
        ");
        $stmt->bind_param('is', $courseid, $accordionid);
        $stmt->execute();
        $result = $stmt->get_result();
        $instance = $result->fetch_assoc();
        $stmt->close();
        
        if (!$instance) {
            // Créer une nouvelle instance
            $now = time();
            $stmt = $mysqli->prepare("
                INSERT INTO mdl_accordion_instances 
                (courseid, accordionid, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->bind_param('isiii', $courseid, $accordionid, $userid, $now, $now);
            $stmt->execute();
            $instance_id = $stmt->insert_id;
            $stmt->close();
        } else {
            $instance_id = $instance['id'];
            
            // Mettre à jour la date de modification de l'instance
            $now = time();
            $stmt = $mysqli->prepare("
                UPDATE mdl_accordion_instances
                SET updated_by = ?, updated_at = ?
                WHERE id = ?
            ");
            $stmt->bind_param('iii', $userid, $now, $instance_id);
            $stmt->execute();
            $stmt->close();
        }
        
        // Sauvegarder ou mettre à jour l'item
        if ($itemId > 0) {
            // Mise à jour d'un item existant
            $now = time();
            $stmt = $mysqli->prepare("
                UPDATE mdl_accordion_items
                SET title = ?,
                    content = ?,
                    is_expanded = ?,
                    item_order = ?,
                    heading_id = ?,
                    collapse_id = ?,
                    updated_by = ?,
                    updated_at = ?
                WHERE id = ?
                AND accordion_instance_id = ?
            ");
            $stmt->bind_param(
                'ssiissiiii',
                $title,
                $content,
                $isExpanded,
                $itemOrder,
                $headingId,
                $collapseId,
                $userid,
                $now,
                $itemId,
                $instance_id
            );
            $stmt->execute();
            $affected = $stmt->affected_rows;
            $stmt->close();
            
            if ($affected > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Item mis à jour',
                    'itemId' => $itemId
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Aucune modification effectuée'
                ]);
            }
        } else {
            // Création d'un nouvel item
            $now = time();
            
            // Si pas d'ordre spécifié, le mettre à la fin
            if ($itemOrder === 0) {
                $stmt = $mysqli->prepare("
                    SELECT COALESCE(MAX(item_order), -1) + 1 as next_order
                    FROM mdl_accordion_items
                    WHERE accordion_instance_id = ?
                ");
                $stmt->bind_param('i', $instance_id);
                $stmt->execute();
                $result = $stmt->get_result();
                $row = $result->fetch_assoc();
                $itemOrder = $row['next_order'];
                $stmt->close();
            }
            
            // Générer des IDs uniques si non fournis
            if (!$headingId) {
                $headingId = 'heading' . uniqid();
            }
            if (!$collapseId) {
                $collapseId = 'collapse' . uniqid();
            }
            
            $stmt = $mysqli->prepare("
                INSERT INTO mdl_accordion_items
                (accordion_instance_id, item_order, heading_id, collapse_id, 
                 title, content, is_expanded, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param(
                'iissssiiii',
                $instance_id,
                $itemOrder,
                $headingId,
                $collapseId,
                $title,
                $content,
                $isExpanded,
                $userid,
                $now,
                $now
            );
            $stmt->execute();
            $newItemId = $stmt->insert_id;
            $stmt->close();
            
            echo json_encode([
                'success' => true,
                'message' => 'Nouvel item créé',
                'itemId' => $newItemId,
                'headingId' => $headingId,
                'collapseId' => $collapseId
            ]);
        }
        exit;
    }
    
    // ============================================
    // ACTION: DELETE_ITEM - Supprimer un item
    // ============================================
    if ($action === 'DELETE_ITEM') {
        $itemId = isset($_POST['itemId']) ? intval($_POST['itemId']) : 0;
        
        if (!$itemId) {
            echo json_encode([
                'success' => false,
                'error' => 'itemId manquant'
            ]);
            exit;
        }
        
        $stmt = $mysqli->prepare("
            DELETE FROM mdl_accordion_items
            WHERE id = ?
        ");
        $stmt->bind_param('i', $itemId);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();
        
        if ($affected > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Item supprimé'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'error' => 'Item non trouvé'
            ]);
        }
        exit;
    }
    
    // ============================================
    // ACTION: REORDER - Réordonner les items
    // ============================================
    if ($action === 'REORDER') {
        $items = isset($_POST['items']) ? json_decode($_POST['items'], true) : [];
        
        if (empty($items)) {
            echo json_encode([
                'success' => false,
                'error' => 'Liste d\'items vide'
            ]);
            exit;
        }
        
        $now = time();
        $mysqli->begin_transaction();
        
        try {
            $stmt = $mysqli->prepare("
                UPDATE mdl_accordion_items
                SET item_order = ?, updated_by = ?, updated_at = ?
                WHERE id = ?
            ");
            
            foreach ($items as $item) {
                $itemId = intval($item['id']);
                $order = intval($item['order']);
                $stmt->bind_param('iiii', $order, $userid, $now, $itemId);
                $stmt->execute();
            }
            
            $stmt->close();
            $mysqli->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Ordre mis à jour'
            ]);
        } catch (Exception $e) {
            $mysqli->rollback();
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors du réordonnancement: ' . $e->getMessage()
            ]);
        }
        exit;
    }
    
    // Action inconnue
    echo json_encode([
        'success' => false,
        'error' => 'Action inconnue: ' . $action
    ]);
    
    $mysqli->close();
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}