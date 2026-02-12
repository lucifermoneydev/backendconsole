import { db } from '../config/db';

export async function buildConsoleMenu(userId: string) {

  // 1️⃣ Get user
  const userResult = await db.query(
    `SELECT role, email_verified FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rowCount === 0) {
    throw new Error('User not found');
  }

  const { role, email_verified } = userResult.rows[0];

  // 2️⃣ Fetch role-based menu (include parent_id)
  const menuResult = await db.query(
    `
    SELECT m.id, m.label, m.icon, m.route, m.parent_id
    FROM menus m
    JOIN role_menus rm ON rm.menu_id = m.id
    WHERE rm.role = $1
      AND m.is_active = TRUE
    ORDER BY m.sort_order ASC
    `,
    [role]
  );

  const flatMenu = menuResult.rows;

  // 3️⃣ Build tree structure
  const menuMap: any = {};
  const rootMenu: any[] = [];

  flatMenu.forEach(item => {
    item.children = [];
    menuMap[item.id] = item;
  });

  flatMenu.forEach(item => {
    if (item.parent_id) {
      if (menuMap[item.parent_id]) {
        menuMap[item.parent_id].children.push(item);
      }
    } else {
      rootMenu.push(item);
    }
  });

  // 4️⃣ Attach Genres under Browse
  const browseMenu = rootMenu.find(m => m.label === 'Browse');

  if (browseMenu) {
    const genresResult = await db.query(
      `SELECT id, name, slug FROM genres
       WHERE is_active = TRUE
       ORDER BY name ASC`
    );

    browseMenu.children.push(
      ...genresResult.rows.map((g: any) => ({
        id: g.id,
        label: g.name,
        icon: 'tag',
        route: `/browse/${g.slug}`,
        parent_id: browseMenu.id,
        children: []
      }))
    );
  }

  // 5️⃣ Force Verify Email if not verified
  if (!email_verified) {
    const verifyMenu:any = await db.query(
      `SELECT id, label, icon, route, parent_id
       FROM menus
       WHERE label = 'Verify Email'
       LIMIT 1`
    );

    if (verifyMenu.rowCount > 0) {
      const item = verifyMenu.rows[0];
      item.children = [];
      rootMenu.push(item);
    }
  }

  return rootMenu;
}
