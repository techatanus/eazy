const db = require('../config/db');

exports.dashboard = async (req, res) => {
  try {
    const [adminsRows] = await db.query('SELECT COUNT(*) as c FROM admins');
    const [clientsRows] = await db.query('SELECT COUNT(*) as c FROM clients');
    const [suppliersRows] = await db.query('SELECT COUNT(*) as c FROM suppliers');
    const [openTendersRows] = await db.query(
      "SELECT t.*, c.name as company FROM tenders t LEFT JOIN clients c ON t.client_id=c.id WHERE status='open' ORDER BY closing_date ASC LIMIT 10"
    );

    res.render('dashboard', {
      totals: {
        admins: adminsRows[0].c,
        clients: clientsRows[0].c,
        suppliers: suppliersRows[0].c
      },
      openTenders: openTendersRows
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error in Dashboard');
  }
};

exports.permissionsList = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM permissions ORDER BY created_at DESC');
    res.render('permissions', { permissions: rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error in Permissions');
  }
};

exports.createPermission = async (req, res) => {
  try {
    const { name, description } = req.body;
    await db.query('INSERT INTO permissions (name, description) VALUES (?, ?)', [name, description]);
    res.redirect('/admin/permissions');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating permission');
  }
};

exports.rolesList = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT r.*, u.username as created_by_name FROM roles r LEFT JOIN admins u ON r.created_by=u.id'
    );
    res.render('role', { roles: rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error in Roles');
  }
};

exports.createRole = async (req, res) => {
  try {
    const { name, description, is_admin, is_supervised } = req.body;
    await db.query(
      'INSERT INTO roles (name, description, is_admin, is_supervised, created_by) VALUES (?, ?, ?, ?, ?)',
      [name, description, is_admin ? 1 : 0, is_supervised ? 1 : 0, req.session.adminId || 1]
    );
    res.redirect('/admin/role');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating role');
  }
};
