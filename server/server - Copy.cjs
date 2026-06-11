
const sql = require("mssql");
const express = require("express");
const app = express();
const cors = require("cors");
const bcrypt = require('bcrypt');
const saltRounds = 10; // تعداد دورهای هش کردن (هرچه بیشتر، امنیت بالاتر ولی پردازش سنگین‌تر)
const jwt = require('jsonwebtoken'); // این خط را بالای فایل اضافه کنید
const { createLogger } = require("vite");

const path = require('path');
const fs = require("fs");
///////
const multer = require('multer');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
//app.use(upload.single('file'));
// در قسمت تنظیمات multer (قبل از routeها)
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const { thesisId } = req.params;
      const pool = await sql.connect(config);
      const result = await pool.request()
        .input('thesisId', sql.Int, thesisId)
        .query('SELECT StudentID FROM theses WHERE ThesisID = @thesisId');
      
      if (result.recordset.length === 0) {
        return cb(new Error('پایان‌نامه یافت نشد'));
      }
      
      const studentId = result.recordset[0].StudentID;
      const uploadPath = path.join(__dirname, 'uploads', 'factors',String( studentId));
      
      // ایجاد پوشه اگر وجود نداشته باشد
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      
      cb(null, uploadPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('فقط فایل‌های PDF و تصاویر مجاز هستند'), false);
    }
  }
});



/////////
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
   exposedHeaders: ['Authorization'] // این خط را اضافه کنید
}));
app.use(express.json());

const config = {
  user: "sa",
  password: "1234",
  server: "localhost", 
  database: "parsa",
  port: 1433,
  options: {
    encrypt: false
  }
};
const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();



const checkAdminRole = (req, res, next) => {
  if (!req.user.roles.includes('مدیر سیستم')) {
    return res.status(403).json({ message: 'دسترسی غیرمجاز' });
  }
  next();
};





const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'ورود مجاز نیست.' });
  
  jwt.verify(token, 'your_jwt_secret', async (err, decoded) => {
    if (err) return res.status(403).json({ message: 'توکن نامعتبر است.' });
    
    try {
      const pool = await sql.connect(config);
      const result = await pool.request()
        .input('userId', sql.Int, decoded.id)
        .query(`
          SELECT 
            r.name,
            u.nationalCode 
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          JOIN users u ON ur.user_id = u.id
          WHERE ur.user_id = @userId
        `);
      
      req.user = {
        id: decoded.id,
        nationalCode: decoded.nationalCode || result.recordset[0]?.nationalCode, 
        roles: result.recordset.map(row => row.name),
        selectedRole: decoded.selectedRole // اضافه کردن selectedRole از توکن
      };
      
      // بررسی اینکه selectedRole در roles کاربر وجود دارد
      if (decoded.selectedRole && !req.user.roles.includes(decoded.selectedRole)) {
        return res.status(403).json({ message: 'نقش انتخابی غیرمجاز است.' });
      }
      
      next();
    } catch (error) {
      console.error("SQL error:", error);
      res.status(500).send("خطای سرور");
    }
  });
};

/////login



app.post('/login', async (req, res) => {
  const { userName, password } = req.body;
  
  try {
    let pool = await sql.connect(config);
    const result = await pool.request()
      .input('userName', sql.NVarChar, userName)
      .query(`
        SELECT 
          u.id,
          u.firstName,
          u.lastName,
          u.nationalCode,
          u.userName,
          u.password,
          u.FacultyID,
          u.DepartmentID,
          STUFF((
            SELECT ', ' + r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = u.id
            FOR XML PATH('')
          ), 1, 2, '') AS roles
        FROM users u
        WHERE u.userName = @userName
      `);
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'نام کاربری یا رمز عبور اشتباه است.' });
    }
    
    const user = result.recordset[0];
    const match = await bcrypt.compare(password, user.password);
    
    if (match) {
      const roles = user.roles ? user.roles.split(', ') : [];
      // تنظیم نقش پیش‌فرض: اگر چند نقش وجود دارد، اولین نقش را انتخاب کن
      const selectedRole = roles.length > 0 ? roles[0] : null;
      
      const token = jwt.sign({ 
        id: user.id,
        nationalCode: user.nationalCode,
        roles: roles,
        selectedRole: selectedRole // تنظیم selectedRole به اولین نقش
      }, 'your_jwt_secret', { expiresIn: '1h' });
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        token,
        user: {
          ...userWithoutPassword,
          roles: roles
        }
      });
    } else {
      res.status(401).json({ message: 'نام کاربری یا رمز عبور اشتباه است.' });
    }
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  } finally {
    sql.close();
  }
});

// دریافت لیست دانشکده‌ها


app.get("/faculties", authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);

    let query = 'SELECT FacultyID, FacultyName FROM faculties';

    // نقش‌های سطح دانشگاه → بدون محدودیت
    const superRoles = ['مدیر سیستم', 'معاون پژوهشی دانشگاه', 'مدیر امور پژوهشی', 'کارشناس پژوهشی معاونت پژوهشی'];

    if (!req.user.roles.some(role => superRoles.includes(role))) {
      // این نقش‌ها باید فقط دانشکده خودشون رو ببینن
      const facultyBasedRoles = ['کارشناس پژوهشی دانشکده', 'معاون پژوهشی دانشکده', 'مدیر گروه'];

      if (req.user.roles.some(role => facultyBasedRoles.includes(role))) {
        const userResult = await pool.request()
          .input('userId', sql.Int, req.user.id)
          .query('SELECT FacultyID FROM users WHERE id = @userId');

        if (userResult.recordset[0]?.FacultyID) {
          query += ` WHERE FacultyID = ${userResult.recordset[0].FacultyID}`;
        }
      }
    }

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});




// دریافت لیست کاربران
// app.get("/users", authenticate, checkAdminRole, async (req, res) => {
//   try {
//     await poolConnect;
//     const result = await pool.request().query(`
//       SELECT 
//         u.id, 
//         u.firstName, 
//         u.lastName, 
//         u.nationalCode, 
//         u.userName,
//         u.FacultyID,
//         u.PhoneNumber,
//         f.FacultyName,
//         u.DepartmentID,
//         d.DepartmentName,
//         STUFF((
//           SELECT ', ' + r.name
//           FROM user_roles ur
//           JOIN roles r ON ur.role_id = r.id
//           WHERE ur.user_id = u.id
//           FOR XML PATH('')
//         ), 1, 2, '') AS roles
//       FROM users u
//       LEFT JOIN faculties f ON u.FacultyID = f.FacultyID
//       LEFT JOIN departments d ON u.DepartmentID = d.DepartmentID
//     `);
//     res.json(result.recordset);
//   } catch (err) {
//     console.error("SQL error:", err);
//     res.status(500).send(err.message);
//   }
// });

// Updated server.cjs snippet for /users endpoint with pagination

// دریافت لیست کاربران
app.get("/users", authenticate, checkAdminRole, async (req, res) => {
  try {
    await poolConnect;
    
    const { page = 1, limit = 5 } = req.query;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await pool.request().query(`
      SELECT COUNT(*) as total FROM users
    `);
    const total = countResult.recordset[0].total;

    // Get paginated users
    const result = await pool.request().query(`
      SELECT 
        u.id, 
        u.firstName, 
        u.lastName, 
        u.nationalCode, 
        u.userName,
        u.FacultyID,
        u.PhoneNumber,
        f.FacultyName,
        u.DepartmentID,
        d.DepartmentName,
        STUFF((
          SELECT ', ' + r.name
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = u.id
          FOR XML PATH('')
        ), 1, 2, '') AS roles
      FROM users u
      LEFT JOIN faculties f ON u.FacultyID = f.FacultyID
      LEFT JOIN departments d ON u.DepartmentID = d.DepartmentID
      ORDER BY u.id
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `);

    res.json({
      users: result.recordset,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

// ایجاد کاربر جدید

// app.post("/users", authenticate, checkAdminRole, async (req, res) => {
//   await poolConnect;
//   const transaction = new sql.Transaction(pool);
  
//   try {
//     const { firstName, lastName, nationalCode, userName, password, roles, facultyId, departmentId,phoneNumber } = req.body;
    
//     if (!firstName || !lastName || !nationalCode || !userName || !password || !roles || roles.length === 0) {
//       return res.status(400).send("تمام فیلدهای الزامی هستند");
//     }

//     const hasFacultyRole = roles.some(roleId => [2, 3, 6].includes(roleId)); // نقش‌های "معاون پژوهشی دانشکده"، "کارشناس پژوهشی دانشکده"، "مدیر گروه"
//     const hasDepartmentRole = roles.includes(2); // فرض می‌کنیم ID نقش "مدیر گروه" برابر 2 است

//     if (hasFacultyRole && !facultyId) {
//       return res.status(400).send("انتخاب دانشکده برای نقش‌های معاون پژوهشی، کارشناس پژوهشی یا مدیر گروه الزامی است");
//     }

//     if (hasDepartmentRole && !departmentId) {
//       return res.status(400).send("انتخاب گروه برای نقش مدیر گروه الزامی است");
//     }

//     await transaction.begin();
    
//     const hashedPassword = await bcrypt.hash(password, saltRounds);
//     const userResult = await transaction.request()
//       .input('firstName', sql.NVarChar, firstName)
//       .input('lastName', sql.NVarChar, lastName)
//       .input('nationalCode', sql.NVarChar, nationalCode)
//       .input('userName', sql.NVarChar, userName)
//       .input('password', sql.NVarChar, hashedPassword)
//       .input('facultyId', sql.Int, hasFacultyRole ? facultyId : null)
//       .input('departmentId', sql.Int, hasDepartmentRole ? departmentId : null)
//       .input('phoneNumber', sql.NVarChar, phoneNumber)
//       .query(`
//         INSERT INTO users (firstName, lastName, nationalCode, userName, password, FacultyID, DepartmentID,PhoneNumber)
//         OUTPUT INSERTED.id
//         VALUES (@firstName, @lastName, @nationalCode, @userName, @password, @facultyId, @departmentId,@phoneNumber)
//       `);
    
//     const userId = userResult.recordset[0].id;
    
//     for (const roleId of roles) {
//       await transaction.request()
//         .input('user_id', sql.Int, userId)
//         .input('role_id', sql.Int, roleId)
//         .query('INSERT INTO user_roles (user_id, role_id) VALUES (@user_id, @role_id)');
//     }
    
//     await transaction.commit();
//     res.status(201).send("کاربر با موفقیت اضافه شد");
//   } catch (err) {
//     await transaction.rollback();
//     console.error("SQL error:", err);
//     res.status(500).send(err.message);
//   }
// });

// // ویرایش کاربر
// app.put("/users/:id", authenticate, checkAdminRole, async (req, res) => {
//   await poolConnect;
//   const transaction = new sql.Transaction(pool);
  
//   try {
//     const { id } = req.params;
//     const { firstName, lastName, nationalCode, userName, password, roles, facultyId, departmentId,phoneNumber } = req.body;
    
//     if (!firstName || !lastName || !nationalCode || !userName) {
//       return res.status(400).send("تمام فیلدهای الزامی هستند");
//     }

//     const hasFacultyRole = roles.some(roleId => [2, 3, 6].includes(roleId));
//     const hasDepartmentRole = roles.includes(2); // ID نقش "مدیر گروه" = 2

//     if (hasFacultyRole && !facultyId) {
//       return res.status(400).send("انتخاب دانشکده برای نقش‌های معاون پژوهشی، کارشناس پژوهشی یا مدیر گروه الزامی است");
//     }

//     if (hasDepartmentRole && !departmentId) {
//       return res.status(400).send("انتخاب گروه برای نقش مدیر گروه الزامی است");
//     }

//     await transaction.begin();
    
//     let updateQuery = 'UPDATE users SET firstName = @firstName, lastName = @lastName, nationalCode = @nationalCode, userName = @userName, FacultyID = @facultyId, DepartmentID = @departmentId,PhoneNumber=@phoneNumber';
//     const request = transaction.request()
//       .input('id', sql.Int, id)
//       .input('firstName', sql.NVarChar, firstName)
//       .input('lastName', sql.NVarChar, lastName)
//       .input('nationalCode', sql.NVarChar, nationalCode)
//       .input('userName', sql.NVarChar, userName)
//       .input('facultyId', sql.Int, hasFacultyRole ? facultyId : null)
//       .input('departmentId', sql.Int, hasDepartmentRole ? departmentId : null)
//       .input('phoneNumber', sql.VarChar(11), phoneNumber)
//       ;

//     if (password) {
//       const hashedPassword = await bcrypt.hash(password, saltRounds);
//       updateQuery += ', password = @password';
//       request.input('password', sql.NVarChar, hashedPassword);
//     }

//     updateQuery += ' WHERE id = @id';
//     await request.query(updateQuery);
    
//     await transaction.request()
//       .input('user_id', sql.Int, id)
//       .query('DELETE FROM user_roles WHERE user_id = @user_id');
    
//     if (roles && roles.length > 0) {
//       for (const roleId of roles) {
//         await transaction.request()
//           .input('user_id', sql.Int, id)
//           .input('role_id', sql.Int, roleId)
//           .query('INSERT INTO user_roles (user_id, role_id) VALUES (@user_id, @role_id)');
//       }
//     }
    
//     await transaction.commit();
//     res.status(200).send("اطلاعات کاربر با موفقیت به روز شد");
//   } catch (err) {
//     await transaction.rollback();
//     console.error("SQL error:", err);
//     res.status(500).send(err.message);
//   }
// });


// ایجاد کاربر جدید
app.post("/users", authenticate, checkAdminRole, async (req, res) => {
  await poolConnect;
  const transaction = new sql.Transaction(pool);
  
  try {
    const { firstName, lastName, nationalCode, userName, password, roles, facultyId, departmentId, phoneNumber } = req.body;
    
    if (!firstName || !lastName || !nationalCode || !userName || !password || !roles || roles.length == 0) {
      return res.status(400).send("تمام فیلدهای الزامی هستند");
    }

    const hasFacultyRole = roles.some(roleId => [2, 3, 6].includes(roleId)); // نقش‌های "معاون پژوهشی دانشکده"، "کارشناس پژوهشی دانشکده"، "مدیر گروه"
    const hasDepartmentRole = roles.includes(2); // فرض می‌کنیم ID نقش "مدیر گروه" برابر 2 است

    if (hasFacultyRole && !facultyId) {
      return res.status(400).send("انتخاب دانشکده برای نقش‌های معاون پژوهشی، کارشناس پژوهشی یا مدیر گروه الزامی است");
    }

    if (hasDepartmentRole && !departmentId) {
      return res.status(400).send("انتخاب گروه برای نقش مدیر گروه الزامی است");
    }

    // چک uniqueness نام کاربری قبل از transaction
    const pool = await sql.connect(config);
    const checkUsername = await pool.request()
      .input('userName', sql.NVarChar, userName)
      .query('SELECT COUNT(*) as count FROM users WHERE userName = @userName');
    
    if (checkUsername.recordset[0].count > 0) {
      
      return res.status(400).send("نام کاربری قبلاً وجود دارد");
    }

    await transaction.begin();
    
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const userResult = await transaction.request()
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .input('nationalCode', sql.NVarChar, nationalCode)
      .input('userName', sql.NVarChar, userName)
      .input('password', sql.NVarChar, hashedPassword)
      .input('facultyId', sql.Int, hasFacultyRole ? facultyId : null)
      .input('departmentId', sql.Int, hasDepartmentRole ? departmentId : null)
      .input('phoneNumber', sql.NVarChar, phoneNumber)
      .query(`
        INSERT INTO users (firstName, lastName, nationalCode, userName, password, FacultyID, DepartmentID, PhoneNumber)
        OUTPUT INSERTED.id
        VALUES (@firstName, @lastName, @nationalCode, @userName, @password, @facultyId, @departmentId, @phoneNumber)
      `);
    
    const userId = userResult.recordset[0].id;
    
    for (const roleId of roles) {
      await transaction.request()
        .input('user_id', sql.Int, userId)
        .input('role_id', sql.Int, roleId)
        .query('INSERT INTO user_roles (user_id, role_id) VALUES (@user_id, @role_id)');
    }
    
    await transaction.commit();
    res.status(201).send("کاربر با موفقیت اضافه شد");
  } catch (err) {
    await transaction.rollback();
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

// ویرایش کاربر (برای کامل بودن، چک uniqueness اضافه شده - اگر username تغییر کند)
app.put("/users/:id", authenticate, checkAdminRole, async (req, res) => {
  await poolConnect;
  const transaction = new sql.Transaction(pool);
  
  try {
    const { id } = req.params;
    const { firstName, lastName, nationalCode, userName, password, roles, facultyId, departmentId, phoneNumber } = req.body;
    
    if (!firstName || !lastName || !nationalCode || !userName) {
      return res.status(400).send("تمام فیلدهای الزامی هستند");
    }

    const hasFacultyRole = roles.some(roleId => [2, 3, 6].includes(roleId));
    const hasDepartmentRole = roles.includes(2); // ID نقش "مدیر گروه" = 2

    if (hasFacultyRole && !facultyId) {
      return res.status(400).send("انتخاب دانشکده برای نقش‌های معاون پژوهشی، کارشناس پژوهشی یا مدیر گروه الزامی است");
    }

    if (hasDepartmentRole && !departmentId) {
      return res.status(400).send("انتخاب گروه برای نقش مدیر گروه الزامی است");
    }

    // چک uniqueness نام کاربری (فقط اگر با username فعلی متفاوت باشد)
    const pool = await sql.connect(config);
    const checkUsername = await pool.request()
      .input('userName', sql.NVarChar, userName)
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM users WHERE userName = @userName AND id != @id');
    
    if (checkUsername.recordset[0].count > 0) {
      return res.status(400).send("نام کاربری قبلاً توسط کاربر دیگری استفاده شده است");
    }

    await transaction.begin();
    
    let updateQuery = 'UPDATE users SET firstName = @firstName, lastName = @lastName, nationalCode = @nationalCode, userName = @userName, FacultyID = @facultyId, DepartmentID = @departmentId, PhoneNumber=@phoneNumber';
    const request = transaction.request()
      .input('id', sql.Int, id)
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .input('nationalCode', sql.NVarChar, nationalCode)
      .input('userName', sql.NVarChar, userName)
      .input('facultyId', sql.Int, hasFacultyRole ? facultyId : null)
      .input('departmentId', sql.Int, hasDepartmentRole ? departmentId : null)
      .input('phoneNumber', sql.VarChar(11), phoneNumber)
      ;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateQuery += ', password = @password';
      request.input('password', sql.NVarChar, hashedPassword);
    }

    updateQuery += ' WHERE id = @id';
    await request.query(updateQuery);
    
    await transaction.request()
      .input('user_id', sql.Int, id)
      .query('DELETE FROM user_roles WHERE user_id = @user_id');
    
    if (roles && roles.length > 0) {
      for (const roleId of roles) {
        await transaction.request()
          .input('user_id', sql.Int, id)
          .input('role_id', sql.Int, roleId)
          .query('INSERT INTO user_roles (user_id, role_id) VALUES (@user_id, @role_id)');
      }
    }
    
    await transaction.commit();
    res.status(200).send("اطلاعات کاربر با موفقیت به روز شد");
  } catch (err) {
    await transaction.rollback();
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});




app.get("/roles", async (req, res) => {
  try {
    let pool = await sql.connect(config);
    const result = await pool.request().query('SELECT id, name FROM roles');
    res.json(result.recordset);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  } finally {
    sql.close();
  }
});


// حذف کاربر

  app.delete("/users/:id", authenticate, checkAdminRole, async (req, res) => {

  try {
    const { id } = req.params;

    let pool = await sql.connect(config);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM users WHERE id = @id');
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).send("کاربر مورد نظر یافت نشد");
    }
    
    res.status(200).send("کاربر با موفقیت حذف شد");
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  } finally {
    sql.close();
  }
});

// دریافت اطلاعات یک کاربر خاص (بدون نمایش رمز عبور)
app.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let pool = await sql.connect(config);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, firstName, lastName, nationalCode,userName role FROM users WHERE id = @id');
    
    if (result.recordset.length == 0) {
      return res.status(404).send("کاربر مورد نظر یافت نشد");
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  } finally {
    sql.close();
  }
});











// endpoint برای دریافت تمام متغیرهای سیستم به ترتیب سال نزولی
app.get("/systemvariables", async (req, res) => {
  try {
    let pool = await sql.connect(config);
    const result = await pool.request()
      .query(`
        SELECT * FROM VariableSettings
        ORDER BY year DESC
      `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  } finally {
    sql.close();
  }
});

// endpoint برای حذف متغیرهای سیستم بر اساس سال
app.delete("/system-variables/:year", async (req, res) => {
  try {
    const { year } = req.params;
    let pool = await sql.connect(config);
    const result = await pool.request()
      .input('year', year)
      .query(`
        DELETE FROM VariableSettings
        WHERE year = @year
      `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).send("هیچ متغیر سیستمی برای این سال یافت نشد");
    }
    
    res.status(200).send("متغیرهای سیستم با موفقیت حذف شدند");
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  } finally {
    sql.close();
  }
});

// endpoint برای ذخیره متغیرهای سیستم
app.post("/system-variables",  async (req, res) => {
  try {
    const {
      Year,
      AssistantProfessorBaseSalary,
      TheoreticalDissertationPercentage,
      FieldDissertationPercentage,
      ExperimentalDissertationPercentage,
      TheoreticalThesisPercentage,
      FieldThesisPercentage,
      ExperimentalThesisPercentage
    } = req.body;

    let pool = await sql.connect(config);
    // بررسی وجود رکورد برای سال مورد نظر
    const checkResult = await pool.request()
      .input('Year', Year)
      .query(`
        SELECT COUNT(*) as count FROM VariableSettings
        WHERE year = @Year
      `);
    
    if (checkResult.recordset[0].count > 0) {
      return res.status(400).send("برای این سال قبلاً اطلاعات ثبت شده است");
    }
    const result = await pool.request()
      .input('Year',Year)
      .input('AssistantProfessorBaseSalary', AssistantProfessorBaseSalary)
      .input('TheoreticalDissertationPercentage',  TheoreticalDissertationPercentage)
      .input('FieldDissertationPercentage', FieldDissertationPercentage)
      .input('ExperimentalDissertationPercentage', ExperimentalDissertationPercentage)
      .input('TheoreticalThesisPercentage', TheoreticalThesisPercentage)
      .input('FieldThesisPercentage', FieldThesisPercentage)
      .input('ExperimentalThesisPercentage', ExperimentalThesisPercentage)
      .query(`
        INSERT INTO VariableSettings (
        Year,
          AssistantProfessorBaseSalary,
          TheoreticalDissertationPercentage,
          fieldDissertationPercentage,
          experimentalDissertationPercentage,
          theoreticalThesisPercentage,
          fieldThesisPercentage,
          experimentalThesisPercentage
        ) VALUES (
         @Year,
      @AssistantProfessorBaseSalary,
          @theoreticalDissertationPercentage,
          @FieldDissertationPercentage,
          @ExperimentalDissertationPercentage,
          @TheoreticalThesisPercentage,
          @FieldThesisPercentage,
          @ExperimentalThesisPercentage
        )
      `);
    
    res.status(201).send("متغیرهای سیستم با موفقیت ذخیره شدند");
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  } finally {
    sql.close();
  }
});

// endpoint برای دریافت متغیرهای سیستم بر اساس سال
app.get("/system-variables/:year", async (req, res) => {
  try {
    const { year } = req.params;
    let pool = await sql.connect(config);
    const result = await pool.request()
      .input('year', year)
      .query(`
        SELECT TOP 1 * FROM VariableSettings
        WHERE year = @year
        ORDER BY year DESC
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).send("هیچ متغیر سیستمی برای این سال یافت نشد");
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  } finally {
    sql.close();
  }
});
// endpoint برای دریافت آخرین متغیرهای سیستم
app.get("/system-variables/latest", async (req, res) => {
  try {
    let pool = await sql.connect(config);
    const result = await pool.request()
      .query(`
        SELECT TOP 1 * FROM VariableSettings
        ORDER BY created_at DESC
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).send("هیچ متغیر سیستمی یافت نشد");
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  } finally {
    sql.close();
  }
});


// endpoint برای به‌روزرسانی متغیرهای سیستم
app.put("/system-variables/:year", async (req, res) => {
  try {
    const { year } = req.params;
    const { 
      AssistantProfessorBaseSalary,
      TheoreticalDissertationPercentage,
      FieldDissertationPercentage,
      ExperimentalDissertationPercentage,
      TheoreticalThesisPercentage,
      FieldThesisPercentage,
      ExperimentalThesisPercentage
    } = req.body;

    let pool = await sql.connect(config);
    const result = await pool.request()
      .input('year', year)
      .input('AssistantProfessorBaseSalary', AssistantProfessorBaseSalary)
      .input('TheoreticalDissertationPercentage', TheoreticalDissertationPercentage)
      .input('FieldDissertationPercentage', FieldDissertationPercentage)
      .input('ExperimentalDissertationPercentage', ExperimentalDissertationPercentage)
      .input('TheoreticalThesisPercentage', TheoreticalThesisPercentage)
      .input('FieldThesisPercentage', FieldThesisPercentage)
      .input('ExperimentalThesisPercentage', ExperimentalThesisPercentage)
      .query(`
        UPDATE VariableSettings SET
          AssistantProfessorBaseSalary = @AssistantProfessorBaseSalary,
          TheoreticalDissertationPercentage = @TheoreticalDissertationPercentage,
          FieldDissertationPercentage = @FieldDissertationPercentage,
          ExperimentalDissertationPercentage = @ExperimentalDissertationPercentage,
          TheoreticalThesisPercentage = @TheoreticalThesisPercentage,
          FieldThesisPercentage = @FieldThesisPercentage,
          ExperimentalThesisPercentage = @ExperimentalThesisPercentage
        WHERE year = @year
      `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).send("هیچ متغیر سیستمی برای این سال یافت نشد");
    }
    
    res.status(200).send("متغیرهای سیستم با موفقیت به‌روزرسانی شدند");
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  } finally {
    sql.close();
  }
});

// فعال‌سازی متغیرهای سیستم برای یک سال خاص
app.post("/systemvariables/activate/:year", authenticate, checkAdminRole, async (req, res) => {
  const pool = await sql.connect(config);
  const transaction = new sql.Transaction(pool);
  
  try {
    const { year } = req.params;

    await transaction.begin();

    // اول همه رکوردها را غیرفعال کنیم
    await transaction.request()
      .query(`UPDATE VariableSettings SET IsActive = 0`);

    // سپس رکورد مورد نظر را فعال کنیم
    const result = await transaction.request()
      .input('year', sql.Int, year)
      .query(`UPDATE VariableSettings SET IsActive = 1 WHERE year = @year`);

    if (result.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(404).send("رکوردی برای این سال یافت نشد");
    }

    await transaction.commit();
    res.status(200).send(`متغیرهای سال ${year} با موفقیت فعال شدند`);
  } catch (err) {
    await transaction.rollback();
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

// دریافت متغیرهای فعال فعلی
app.get("/systemvariables/active", async (req, res) => {

  try {
    let pool = await sql.connect(config);
    const result = await pool.request()
      .query(`SELECT * FROM VariableSettings WHERE IsActive = 1`);
    
    if (result.recordset.length === 0) {
      return res.status(404).send("هیچ متغیر فعالی یافت نشد");
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  } finally {
    sql.close();
  }
});

// تغییر رمز عبور کاربر جاری
app.put("/change-password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).send("رمز عبور فعلی و جدید الزامی هستند");
    }

    let pool = await sql.connect(config);
    
    // دریافت کاربر فعلی
    const userResult = await pool.request()
      .input('id', sql.Int, userId)
      .query('SELECT * FROM users WHERE id = @id');
    
    if (userResult.recordset.length === 0) {
      return res.status(404).send("کاربر یافت نشد");
    }
    
    const user = userResult.recordset[0];
    
    // بررسی رمز عبور فعلی
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(401).send("رمز عبور فعلی نادرست است");
    }
    
    // هش کردن رمز عبور جدید
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // به‌روزرسانی رمز عبور
    await pool.request()
      .input('id', sql.Int, userId)
      .input('password', sql.NVarChar, hashedPassword)
      .query('UPDATE users SET password = @password WHERE id = @id');
    
    res.status(200).send("رمز عبور با موفقیت تغییر یافت");
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  } finally {
    sql.close();
  }
});
////////////////

// دریافت لیست دانشکده‌ها
app.get("/faculties", authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query('SELECT FacultyID, FacultyName FROM faculties');
    res.json(result.recordset);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

///////////////
app.post('/change-role', authenticate, async (req, res) => {
  const { role } = req.body;
  
  try {
    // بررسی اینکه نقش انتخابی در نقش‌های کاربر وجود دارد
    if (!req.user.roles.includes(role)) {
      return res.status(403).json({ message: 'نقش انتخابی غیرمجاز است.' });
    }
    
    // تولید توکن جدید با selectedRole
    const token = jwt.sign({ 
      id: req.user.id,
      nationalCode: req.user.nationalCode,
      roles: req.user.roles,
      selectedRole: role
    }, 'your_jwt_secret', { expiresIn: '1h' });
    
    res.json({ token });
  } catch (err) {
    console.error("Error changing role:", err);
    res.status(500).send(err.message);
  }
});
//////////////

// دریافت دانشجو بر اساس شماره دانشجویی (با فیلتر دانشکده برای کارشناس پژوهشی)
app.get("/students/:studentId", authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.id;
    
    const pool = await sql.connect(config);
    
    // دریافت دانشکده کاربر (اگر کارشناس پژوهشی باشد)
    let facultyFilter = "";
    if (!req.user.roles.includes('مدیر سیستم')) {
      const userResult = await pool.request()
        .input('userId', sql.Int, userId)
        .query('SELECT FacultyID FROM users WHERE id = @userId');
      
      if (userResult.recordset[0]?.FacultyID) {
        facultyFilter = `AND s.FacultyID = ${userResult.recordset[0].FacultyID}`;
      }
    }
    
    const result = await pool.request()
      .input('studentId', sql.NChar(10), studentId)
      .query(`
        SELECT 
          s.StudentID,
          s.FirstName,
          s.LastName,
          s.NationalID,
          d.DepartmentName,
          f.FacultyName,
          el.LevelName
        FROM students s
        JOIN departments d ON s.DepartmentID = d.DepartmentID
        JOIN faculties f ON s.FacultyID = f.FacultyID
        LEFT JOIN educationlevels el ON s.LevelID = el.LevelID
        WHERE s.StudentID = @studentId
        ${facultyFilter}
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'دانشجو یافت نشد یا شما مجوز دسترسی به این دانشجو را ندارید' });
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});


// دریافت لیست دانشجویان یک دانشکده خاص (با احراز هویت و کنترل دسترسی)
app.get("/students/faculty/:facultyId", authenticate, async (req, res) => {
  try {
    const { facultyId } = req.params;
    const userId = req.user.id;
    
    // بررسی مجوز دسترسی
    if (!req.user.roles.includes('مدیر سیستم')) {
      // برای کاربران غیر مدیر، بررسی می‌کنیم که آیا به دانشکده مورد نظر دسترسی دارند یا نه
      const pool = await sql.connect(config);
      const userResult = await pool.request()
        .input('userId', sql.Int, userId)
        .query('SELECT FacultyID FROM users WHERE id = @userId');
      
      if (userResult.recordset[0]?.FacultyID !== parseInt(facultyId)) {
        return res.status(403).json({ message: 'شما مجوز دسترسی به دانشجویان این دانشکده را ندارید' });
      }
    }
    
    // دریافت لیست دانشجویان
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('facultyId', sql.Int, facultyId)
      .query(`
        SELECT 
          s.StudentID,
          s.FirstName,
          s.LastName,
          s.NationalID,
          d.DepartmentName,
          f.FacultyName,
          el.LevelName
        FROM students s
        JOIN departments d ON s.DepartmentID = d.DepartmentID
        JOIN faculties f ON s.FacultyID = f.FacultyID
        LEFT JOIN educationlevels el ON s.LevelID = el.LevelID
        WHERE s.FacultyID = @facultyId
        ORDER BY s.LastName, s.FirstName
      `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});


// دریافت لیست تمام دانشجویان (فقط برای مدیر سیستم)
app.get("/students/all", authenticate, async (req, res) => {
  try {
   
    // بررسی آیا کاربر مدیر سیستم است یا نه
    if (!req.user.roles.includes('مدیر سیستم')) {
      return res.status(403).json({ message: 'فقط مدیر سیستم می‌تواند به لیست تمام دانشجویان دسترسی داشته باشد' });
    }

    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
        s.StudentID,
        s.FirstName,
        s.LastName,
        s.NationalID,
        d.DepartmentName,
        f.FacultyName,
        el.LevelName
      FROM students s
      JOIN departments d ON s.DepartmentID = d.DepartmentID
      JOIN faculties f ON s.FacultyID = f.FacultyID
      LEFT JOIN educationlevels el ON s.LevelID = el.LevelID
      ORDER BY f.FacultyName, s.LastName, s.FirstName
    `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});


// دریافت لیست اساتید (کاربران با نقش عضو هیات علمی)

app.get("/professors", authenticate, async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT 
        u.id,
        u.firstName,
        u.lastName,
        u.nationalCode
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.id = 1
    `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});


// دریافت لیست مقاطع تحصیلی

app.get("/educationlevels", authenticate, async (req, res) => {
  try {
    await poolConnect; // استفاده از connection pool موجود
    const result = await pool.request().query(`
      SELECT LevelID as id, LevelName as name 
      FROM educationlevels
    `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});




// دریافت لیست پایان‌نامه‌ها با فیلترهای مختلف بر اساس نقش کاربر





app.get("/theses", authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const selectedRole = req.user.selectedRole; // استفاده از selectedRole از توکن

    if (!selectedRole) {
      return res.status(400).json({ message: 'نقش انتخابی مشخص نشده است.' });
    }

    let query = `
      SELECT 
        t.ThesisID,
        t.Title,
        t.ThesisType,
        t.StudentID,
        t.ParsaType,
        s.FirstName + ' ' + s.LastName as StudentName,
        el.LevelName,
        el.LevelID,
        f.FacultyID,  
        f.FacultyName,
        d.DepartmentID,  
        d.DepartmentName,
        t.Deputy_Confirmation
      FROM theses t
      JOIN students s ON t.StudentID = s.StudentID
      LEFT JOIN educationlevels el ON t.LevelID = el.LevelID
      LEFT JOIN faculties f ON s.FacultyID = f.FacultyID
      LEFT JOIN departments d ON s.DepartmentID = d.DepartmentID
    `;

    // اگر نقش انتخابی 'عضو هیات علمی' است، فقط پایان‌نامه‌های استاد را نمایش بده
    if (selectedRole === 'عضو هیات علمی') {
      query += `
        JOIN professors_students ps ON t.ThesisID = ps.ThesisID
        WHERE ps.professornationalcode = '${req.user.nationalCode}'
      `;
    }

    // بقیه فیلترها (مثل دانشکده/گروه) بر اساس selectedRole
    if (['کارشناس پژوهشی دانشکده', 'معاون پژوهشی دانشکده', 'مدیر گروه'].includes(selectedRole)) {
      const userResult = await pool.request()
        .input('userId', sql.Int, req.user.id)
        .query('SELECT FacultyID, DepartmentID FROM users WHERE id = @userId');
      
      const { FacultyID, DepartmentID } = userResult.recordset[0] || {};
      
      if (FacultyID) {
        query += query.includes('WHERE') ? ' AND' : ' WHERE';
        query += ` s.FacultyID = ${FacultyID}`;
      }
      if (selectedRole === 'مدیر گروه' && DepartmentID) {
        query += query.includes('WHERE') ? ' AND' : ' WHERE';
        query += ` s.DepartmentID = ${DepartmentID}`;
      }
    }

    query += " ORDER BY t.ThesisID DESC";

    const result = await pool.request().query(query);

    // برای هر پایان‌نامه، اساتید مربوطه را دریافت کنید
    const thesesWithProfessors = await Promise.all(
      result.recordset.map(async (thesis) => {
        const profResult = await pool.request()
          .input('thesisId', sql.Int, thesis.ThesisID)
          .query(`
            SELECT 
              p.firstName + ' ' + p.lastName as professorName,
              ps.percentforprefessor,
              p.nationalCode as professornationalcode
            FROM professors_students ps
            JOIN users p ON ps.professornationalcode = p.nationalCode
            WHERE ps.ThesisID = @thesisId
          `);
        
        return {
          ...thesis,
          professors: profResult.recordset,
          student: {
            FacultyID: thesis.FacultyID,
            DepartmentID: thesis.DepartmentID
          }
        };
      })
    );

    res.json(thesesWithProfessors);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});
// تابع کمکی برای ثبت تاریخچه
const addThesisHistory = async (thesisId, status, description, userId = null) => {
  try {
    const pool = await sql.connect(config);
    
    // دریافت اطلاعات کاربر اگر userId وجود دارد
    let userInfo = '';
    if (userId) {
      const userResult = await pool.request()
        .input('userId', sql.Int, userId)
        .query('SELECT firstName, lastName FROM users WHERE id = @userId');
      
      if (userResult.recordset.length > 0) {
        userInfo = ` (${userResult.recordset[0].firstName} ${userResult.recordset[0].lastName})`;
      }
    }
    
    // دریافت تاریخ و زمان فعلی از سرور و تبدیل به تاریخ شمسی
    const now = new Date();
    const persianDate = new Intl.DateTimeFormat('fa-IR').format(now);
    const persianTime = now.toLocaleTimeString('fa-IR');
    
    await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .input('status', sql.NVarChar, status)
      .input('description', sql.NVarChar, description + userInfo)
      .input('persianDate', sql.NVarChar, persianDate)
      .input('persianTime', sql.NVarChar, persianTime)
      .query(`
        INSERT INTO thesis_history 
        (ThesisID, Status, Description, PersianDate, PersianTime)
        VALUES (@thesisId, @status, @description, @persianDate, @persianTime)
      `);
  } catch (err) {
    console.error("Error adding thesis history:", err);
  }
};
//دریافت تاریخچه یک پایان نامه
app.get("/theses/:thesisId/history", authenticate, async (req, res) => {
  try {
    const { thesisId } = req.params;
    const pool = await sql.connect(config);
    
    const result = await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .query(`
        SELECT 
          HistoryID,
          Status,
          Description,
          PersianDate,
          PersianTime
        FROM thesis_history
        WHERE ThesisID = @thesisId
        ORDER BY HistoryID DESC
      `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});
// ثبت پایان‌نامه جدید


// ثبت پایان‌نامه جدید
app.post("/theses", authenticate, async (req, res) => {
  const pool = await sql.connect(config);
  const transaction = new sql.Transaction(pool);
  
  try {
    const { 
      studentId, 
      title, 
      thesisType, 
      levelId,
      professors,
      ApprovedAmount,
      parsaType
    } = req.body;

    // اعتبارسنجی نقش کاربر
    if (!req.user.roles.includes('مدیر سیستم') && !req.user.roles.includes('کارشناس پژوهشی دانشکده')) {
      return res.status(403).send('شما مجوز ثبت پایان‌نامه را ندارید');
    }

    // اعتبارسنجی فیلدها
    if (!studentId || !title || !thesisType || !levelId || !professors || professors.length === 0) {
      return res.status(400).send("تمام فیلدهای الزامی هستند");
    }

    // بررسی مجموع درصد مشارکت اساتید
    const totalParticipation = professors.reduce(
      (sum, p) => sum + parseInt(p.participation || 0),
      0
    );
    if (totalParticipation !== 100) {
      return res.status(400).send("مجموع درصد مشارکت اساتید باید ۱۰۰ باشد");
    }

    // بررسی وجود دانشجو در دیتابیس
    const studentCheck = await pool.request()
      .input('studentId', sql.NChar(10), studentId)
      .query(`
        SELECT StudentID
        FROM students
        WHERE StudentID = @studentId
      `);

    if (studentCheck.recordset.length === 0) {
      return res.status(404).send("دانشجو با این شماره دانشجویی یافت نشد");
    }

    await transaction.begin();
    
    // ثبت پایان‌نامه
    const thesisResult = await transaction.request()
      .input('StudentID', sql.NChar(10), studentId)
      .input('Title', sql.NVarChar, title)
      .input('ThesisType', sql.NVarChar, thesisType)
      .input('LevelID', sql.Int, levelId)
      .input('ApprovedAmount', sql.Int, ApprovedAmount)
      .input('ParsaType', sql.NVarChar(1), parsaType)
      .query(`
        INSERT INTO theses (StudentID, Title, ThesisType, LevelID, ApprovedAmount, ParsaType)
        OUTPUT INSERTED.ThesisID
        VALUES (@StudentID, @Title, @ThesisType, @LevelID, @ApprovedAmount, @ParsaType)
      `);
    
    const thesisId = thesisResult.recordset[0].ThesisID;

    // ثبت اساتید راهنما و درصد مشارکت آنها
    for (const professor of professors) {
      await transaction.request()
        .input('ThesisID', sql.Int, thesisId)
        .input('professornationalcode', sql.NVarChar(10), professor.nationalCode)
        .input('StudentID', sql.NChar(10), studentId)
        .input('ParticipationPercentage', sql.Int, professor.participation)
        .query(`
          INSERT INTO professors_students (professornationalcode, student_id, ThesisID, percentforprefessor)
          VALUES (@professornationalcode, @StudentID, @ThesisID, @ParticipationPercentage)
        `);
    }
    
    await transaction.commit();
    
    // ثبت تاریخچه
    await addThesisHistory(
      thesisId, 
      'ثبت پایان‌نامه', 
      'پایان‌نامه جدید توسط کارشناس پژوهشی دانشکده ثبت شد',
      req.user.id
    );
    
    res.status(201).send("پایان‌نامه با موفقیت ثبت شد");
  } catch (err) {
    await transaction.rollback();
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

// تایید/رد پایان‌نامه توسط معاون پژوهشی
app.put("/theses/:thesisId/confirm", authenticate, async (req, res) => {
  try {
    const { thesisId } = req.params;
    const { confirm } = req.body;
    
    // بررسی نقش کاربر
    if (!req.user.roles.includes('معاون پژوهشی دانشکده')) {
      return res.status(403).send('شما مجوز تایید پایان‌نامه را ندارید');
    }

    const pool = await sql.connect(config);
    
    // بررسی اینکه پایان‌نامه مربوط به دانشکده کاربر است
    const checkResult = await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .input('userId', sql.Int, req.user.id)
      .query(`
        SELECT t.ThesisID
        FROM theses t
        JOIN students s ON t.StudentID = s.StudentID
        JOIN users u ON s.FacultyID = u.FacultyID
        WHERE t.ThesisID = @thesisId AND u.id = @userId
      `);
    
    if (checkResult.recordset.length === 0) {
      return res.status(403).send('شما فقط می‌توانید پایان‌نامه‌های دانشکده خود را تایید کنید');
    }

    // به‌روزرسانی وضعیت تایید
    await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .input('confirm', sql.Bit, confirm)
      .query(`
        UPDATE theses
        SET Deputy_Confirmation = @confirm
        WHERE ThesisID = @thesisId
      `);
    // ثبت تاریخچه
    const action = confirm ? 'تایید' : 'رد';
    await addThesisHistory(
      thesisId, 
      `${action} پایان‌نامه`, 
      `پایان‌نامه توسط معاون پژوهشی دانشکده ${action} شد`,
      req.user.id
    );
    res.status(200).send(confirm ? 'پایان‌نامه با موفقیت تایید شد' : 'تایید پایان‌نامه لغو شد');
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});
//ویرایش پایان نامه
app.put("/theses/:thesisId", authenticate, async (req, res) => {
  const pool = await sql.connect(config);
  const transaction = new sql.Transaction(pool);

  try {
    const { thesisId } = req.params;
    const { 
      title, 
      thesisType, 
      levelId,
      professors,
      studentId // اضافه کردن studentId از body درخواست
    } = req.body;

    // اعتبارسنجی
    if (!title || !thesisType || !levelId || !professors || professors.length === 0 || !studentId) {
      return res.status(400).send("تمام فیلدهای الزامی هستند");
    }

    // بررسی مجموع درصد مشارکت
    const totalParticipation = professors.reduce(
      (sum, p) => sum + parseInt(p.participation || 0),
      0
    );
    if (totalParticipation !== 100) {
      return res.status(400).send("مجموع درصد مشارکت اساتید باید ۱۰۰ باشد");
    }

    await transaction.begin();

    // به‌روزرسانی اطلاعات پایه پایان‌نامه
    await transaction.request()
      .input('thesisId', sql.Int, thesisId)
      .input('Title',  title)
      .input('thesisType', sql.NVarChar, thesisType)
      .input('levelId', sql.Int, levelId)
      .query(`
        UPDATE theses 
        SET 
          Title = @Title,
          ThesisType = @thesisType,
          LevelID = @levelId
        WHERE ThesisID = @thesisId
      `);

    // حذف اساتید قبلی
    await transaction.request()
      .input('thesisId', sql.Int, thesisId)
      .query('DELETE FROM professors_students WHERE ThesisID = @thesisId');

    // اضافه کردن اساتید جدید
    for (const professor of professors) {
      await transaction.request()
        .input('thesisId', sql.Int, thesisId)
        .input('professorId', sql.NVarChar, professor.nationalCode)
        .input('student_id',  studentId) // استفاده از studentId دریافت شده
        .input('participation', sql.Int, professor.participation)
        .query(`
          INSERT INTO professors_students (ThesisID, professornationalcode, student_id, percentforprefessor)
          VALUES (@thesisId, @professorId, @student_id, @participation)
        `);
    }

    await transaction.commit();
    res.status(200).send("پایان‌نامه با موفقیت ویرایش شد");
  } catch (err) {
    await transaction.rollback();
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

// حذف پایان‌نامه
// حذف پایان‌نامه
app.delete("/theses/:thesisId", authenticate, async (req, res) => {
  const pool = await sql.connect(config);
  const transaction = new sql.Transaction(pool);
  
  try {
    const { thesisId } = req.params;

    await transaction.begin();
    
    // 1. حذف روابط اساتید
    await transaction.request()
      .input('thesisId', sql.Int, thesisId)
      .query('DELETE FROM professors_students WHERE ThesisID = @thesisId');
    
    // 2. حذف خود پایان‌نامه
    const result = await transaction.request()
      .input('thesisId', sql.Int, thesisId)
      .query('DELETE FROM theses WHERE ThesisID = @thesisId');
    
    if (result.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(404).send("پایان‌نامه مورد نظر یافت نشد");
    }
    
    await transaction.commit();
    res.status(200).send("پایان‌نامه با موفقیت حذف شد");
  } catch (err) {
    await transaction.rollback();
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});
  
//////////////

// app.get("/departments/faculty/:facultyId", authenticate, async (req, res) => {
//   try {
//     const { facultyId } = req.params;
//     const pool = await sql.connect(config);
    
//     let query = `SELECT DepartmentID, DepartmentName, FacultyID FROM departments WHERE FacultyID = @facultyId`;
    
//     // اگر کاربر مدیر گروه است
//     if (req.user.roles.includes('مدیر گروه')) {
//       // دریافت گروه کاربر
//       const userResult = await pool.request()
//         .input('userId', sql.Int, req.user.id)
//         .query('SELECT DepartmentID FROM users WHERE id = @userId');
      
//       if (userResult.recordset[0]?.DepartmentID) {
//         query += ` AND DepartmentID = ${userResult.recordset[0].DepartmentID}`;
//       }
//     }
    
//     const result = await pool.request()
//       .input('facultyId', sql.Int, facultyId)
//       .query(query);
    
//     res.json(result.recordset);
//   } catch (err) {
//     console.error("SQL error:", err);
//     res.status(500).send(err.message);
//   }
// });


// app.get("/departments/faculty/:facultyId", authenticate, async (req, res) => {
//   try {
//     const { facultyId } = req.params;
//     const pool = await sql.connect(config);

//     let query = `SELECT DepartmentID, DepartmentName, FacultyID FROM departments WHERE FacultyID = @facultyId`;

//     // نقش‌هایی که همه گروه‌ها رو می‌بینند
//     const superRoles = ['مدیر سیستم', 'معاون پژوهشی دانشگاه', 'مدیر امور پژوهشی', 'کارشناس پژوهشی معاونت پژوهشی'];

//     if (!req.user.roles.some(role => superRoles.includes(role))) {
//       // اگر مدیر گروه باشه → محدود به گروه خودش
//       if (req.user.roles.includes('مدیر گروه')) {
//         const userResult = await pool.request()
//           .input('userId', sql.Int, req.user.id)
//           .query('SELECT DepartmentID FROM users WHERE id = @userId');

//         if (userResult.recordset[0]?.DepartmentID) {
//           query += ` AND DepartmentID = ${userResult.recordset[0].DepartmentID}`;
//         }
//       }
//       // اگر معاون پژوهشی دانشکده یا کارشناس پژوهشی دانشکده باشه → همه گروه‌های همون دانشکده
//       // (همین شرط FacultyID که بالا تو WHERE هست کافی هست)
//     }

//     const result = await pool.request()
//       .input('facultyId', sql.Int, facultyId)
//       .query(query);

//     res.json(result.recordset);
//   } catch (err) {
//     console.error("SQL error:", err);
//     res.status(500).send(err.message);
//   }
// });

app.get("/departments/faculty/:facultyId", authenticate, async (req, res) => {
  try {
    const { facultyId } = req.params;
    const pool = await sql.connect(config);

    let query = `SELECT DepartmentID, DepartmentName, FacultyID 
                 FROM departments 
                 WHERE FacultyID = @facultyId`;

    // نقش‌های سطح دانشگاه → همه گروه‌ها رو می‌بینن
    const superRoles = ['مدیر سیستم', 'معاون پژوهشی دانشگاه', 'مدیر امور پژوهشی', 'کارشناس پژوهشی معاونت پژوهشی'];

    if (!req.user.roles.some(role => superRoles.includes(role))) {
      // اگر مدیر گروه → محدود به هم FacultyID و هم DepartmentID
      if (req.user.roles.includes('مدیر گروه')) {
        const userResult = await pool.request()
          .input('userId', sql.Int, req.user.id)
          .query('SELECT DepartmentID FROM users WHERE id = @userId');

        if (userResult.recordset[0]?.DepartmentID) {
          query += ` AND DepartmentID = ${userResult.recordset[0].DepartmentID}`;
        }
      }
      // اگر معاون پژوهشی دانشکده یا کارشناس پژوهشی دانشکده → فقط محدودیت FacultyID کافیه
      // چون در query بالا FacultyID = @facultyId هست و DepartmentID رو دخالت نمی‌دیم
    }

    const result = await pool.request()
      .input('facultyId', sql.Int, facultyId)
      .query(query);

    res.json(result.recordset);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});


// Add new department
app.post("/departments", authenticate, checkAdminRole, async (req, res) => {
  const pool = await sql.connect(config);
  const transaction = new sql.Transaction(pool);
  
  try {
    const { departmentName, facultyId } = req.body;
    
    if (!departmentName || !facultyId) {
      return res.status(400).send("نام گروه و دانشکده الزامی هستند");
    }

    await transaction.begin();
    
    const result = await transaction.request()
      .input('departmentName', sql.NVarChar, departmentName)
      .input('facultyId', sql.Int, facultyId)
      .query(`
        INSERT INTO departments (DepartmentName, FacultyID)
        OUTPUT INSERTED.DepartmentID
        VALUES (@departmentName, @facultyId)
      `);
    
    await transaction.commit();
    res.status(201).send("گروه با موفقیت اضافه شد");
  } catch (err) {
    await transaction.rollback();
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

// Update department
app.put("/departments/:departmentId", authenticate, checkAdminRole, async (req, res) => {
  const pool = await sql.connect(config);
  const transaction = new sql.Transaction(pool);
  
  try {
    const { departmentId } = req.params;
    const { departmentName, facultyId } = req.body;
    
    if (!departmentName || !facultyId) {
      return res.status(400).send("نام گروه و دانشکده الزامی هستند");
    }

    await transaction.begin();
    
    const result = await transaction.request()
      .input('departmentId', sql.Int, departmentId)
      .input('departmentName', sql.NVarChar, departmentName)
      .input('facultyId', sql.Int, facultyId)
      .query(`
        UPDATE departments
        SET DepartmentName = @departmentName, FacultyID = @facultyId
        WHERE DepartmentID = @departmentId
      `);
    
    if (result.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(404).send("گروه مورد نظر یافت نشد");
    }
    
    await transaction.commit();
    res.status(200).send("گروه با موفقیت ویرایش شد");
  } catch (err) {
    await transaction.rollback();
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

// Delete department
app.delete("/departments/:departmentId", authenticate, checkAdminRole, async (req, res) => {
  const pool = await sql.connect(config);
  const transaction = new sql.Transaction(pool);
  
  try {
    const { departmentId } = req.params;
    
    await transaction.begin();
    
    const result = await transaction.request()
      .input('departmentId', sql.Int, departmentId)
      .query('DELETE FROM departments WHERE DepartmentID = @departmentId');
    
    if (result.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(404).send("گروه مورد نظر یافت نشد");
    }
    
    await transaction.commit();
    res.status(200).send("گروه با موفقیت حذف شد");
  } catch (err) {
    await transaction.rollback();
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});
/////////////
// دریافت اطلاعات یک پایان‌نامه خاص
app.get("/theses/:thesisId", authenticate, async (req, res) => {
  try {
    const { thesisId } = req.params;
   

    const pool = await sql.connect(config);
    
    // 1. دریافت اطلاعات پایه پایان‌نامه
    const thesisResult = await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .query(`
        SELECT 
          t.ThesisID,
          t.Title,
          t.ThesisType,
          t.StudentID,
          s.FirstName + ' ' + s.LastName as StudentName,
          s.NationalID as StudentNationalID,
          el.LevelID,
          el.LevelName,
          f.FacultyID,
          f.FacultyName,
          d.DepartmentID,
          d.DepartmentName,
          t.ApprovedAmount,
          t.ParsaType,
          t.Deputy_Confirmation
        FROM theses t
        JOIN students s ON t.StudentID = s.StudentID
        LEFT JOIN educationlevels el ON t.LevelID = el.LevelID
        LEFT JOIN faculties f ON s.FacultyID = f.FacultyID
        LEFT JOIN departments d ON s.DepartmentID = d.DepartmentID
        WHERE t.ThesisID = @thesisId
      `);

    if (thesisResult.recordset.length == 0) {
      return res.status(404).json({ message: 'پایان‌نامه یافت نشد' });
    }

    const thesis = thesisResult.recordset[0];

    // 2. بررسی دسترسی کاربر
   

    // 3. دریافت اطلاعات اساتید راهنما
    const professorsResult = await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .query(`
        SELECT 
          u.id,
          u.firstName + ' ' + u.lastName as professorName,
          u.nationalCode,
          ps.percentforprefessor as participation
        FROM professors_students ps
        JOIN users u ON ps.professornationalcode = u.nationalCode
        WHERE ps.ThesisID = @thesisId
      `);
// console.log()
    // 4. دریافت فاکتورهای ثبت شده
    const factorsResult = await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .query(`
        SELECT 
          FactorID,
          FactorNumber,
          FactorDate,
          Amount,
          Description,
          Filepath,
          IsConfirmedByExpert,
          IsConfirmedByDeputy
        FROM factors
        WHERE ThesisID = @thesisId
        ORDER BY FactorDate DESC
      `);

    // 5. دریافت تاریخچه پایان‌نامه
    const historyResult = await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .query(`
        SELECT 
          HistoryID,
          Status,
          Description,
          PersianDate,
          PersianTime
        FROM thesis_history
        WHERE ThesisID = @thesisId
        ORDER BY HistoryID DESC
      `);

    // ترکیب تمام اطلاعات و ارسال پاسخ
    res.json({
      ...thesis,
      professors: professorsResult.recordset,
      factors: factorsResult.recordset,
      history: historyResult.recordset
    });

  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});
// ثبت فاکتور جدید
app.post("/theses/:thesisId/factors", authenticate, upload.single('file'), async (req, res) => {

  try {
    
    const { thesisId } = req.params;
    
    // بررسی نقش کاربر
    if (!req.user.roles.includes('عضو هیات علمی')) {
      return res.status(403).send('شما مجوز ثبت هزینه را ندارید');
    }

 

    if (!req.file) {
      return res.status(400).send('فایل فاکتور الزامی است');
    }

    const { factorNumber, factorDate, amount, description } = req.body;
 
   
    // مسیر نسبی فایل برای ذخیره در دیتابیس
     const relativePath = req.file.path.replace(/^.*uploads[\\/]/, '');
const filePath = `/uploads/${relativePath.replace(/\\/g, '/')}`;

 

    // ذخیره اطلاعات در دیتابیس
    await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .input('factorNumber', sql.NVarChar, factorNumber)
      .input('factorDate', sql.NVarChar, factorDate)
      .input('amount', sql.Decimal, amount)
      .input('description', sql.NVarChar, description)
      .input('filePath', sql.NVarChar, filePath)
      .query(`
        INSERT INTO factors 
        (ThesisID, FactorNumber, FactorDate, Amount, Description, Filepath)
        VALUES 
        (@thesisId, @factorNumber, @factorDate, @amount, @description, @filePath)
      `);
       await addThesisHistory(
      thesisId, 
      'ثبت فاکتور', 
      'فاکتور به مبلغ '+amount +"  و تاریخ "+factorDate+ " توسط استاد راهنما ثبت شد  ",
      req.user.id
    );

    res.status(201).send('فاکتور با موفقیت ثبت شد');
  } catch (err) {
    console.error("Error saving factor:", err);
    res.status(500).send(err.message);
  }
});
// دریافت لیست فاکتورهای یک پایان‌نامه
app.get("/theses/:thesisId/factors", authenticate, async (req, res) => {

  try {
    const { thesisId } = req.params;
    
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .query(`
        SELECT 
          FactorID,
          FactorNumber,
          FactorDate,
          Amount,
          Description,
          Filepath,
          IsConfirmedByExpert,
          IsConfirmedByDeputy
        FROM factors
        WHERE ThesisID = @thesisId
        ORDER BY FactorDate DESC
      `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching factors:", err);
    res.status(500).send(err.message);
  }
});



// تایید فاکتور توسط کارشناس
app.put("/factors/:factorId/confirm-expert", authenticate, async (req, res) => {
  try {
    const { factorId } = req.params;
    const { status } = req.body;
    
    // بررسی نقش کاربر
    if (!req.user.roles.includes('کارشناس پژوهشی دانشکده')) {
      return res.status(403).send('شما مجوز تایید فاکتور را ندارید');
    }

    const pool = await sql.connect(config);
    
    await pool.request()
      .input('factorId', sql.Int, factorId)
      .input('status', sql.Int, status)
      .query(`
        UPDATE factors
        SET IsConfirmedByExpert = @status
        WHERE FactorID = @factorId
      `);

    res.status(200).send(`فاکتور با موفقیت ${status ? 'تایید' : 'رد'} شد`);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

// تایید فاکتور توسط معاون پژوهشی
app.put("/factors/:factorId/confirm-deputy", authenticate, async (req, res) => {
  try {
    const { factorId } = req.params;
    const { status } = req.body;
  
    // بررسی نقش کاربر
    if (!req.user.roles.includes('معاون پژوهشی دانشکده')) {
      return res.status(403).send('شما مجوز تایید فاکتور را ندارید');
    }

    const pool = await sql.connect(config);
    
    // بررسی اینکه فاکتور قبلاً توسط کارشناس تایید شده باشد
    const checkResult = await pool.request()
      .input('factorId', sql.Int, factorId)
      .query(`
        SELECT IsConfirmedByExpert 
        FROM factors 
        WHERE FactorID = @factorId
      `);

    if (checkResult.recordset[0]?.IsConfirmedByExpert != 1) {
      return res.status(400).send('فاکتور باید ابتدا توسط کارشناس تایید شود');
    }

    await pool.request()
      .input('factorId', sql.Int, factorId)
      .input('status', sql.Int, status)
      .query(`
        UPDATE factors
        SET IsConfirmedByDeputy = @status
        WHERE FactorID = @factorId
      `);

    res.status(200).send('فاکتور با موفقیت توسط معاون پژوهشی تایید شد');
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});


// حذف فاکتور
app.delete("/factors/:factorId", authenticate, async (req, res) => {
  try {
    const { factorId } = req.params;
    
    // بررسی نقش کاربر - فقط استاد راهنما یا مدیر سیستم می‌تواند حذف کند
    if (!req.user.roles.includes('کارشناس پژوهشی دانشکده') && !req.user.roles.includes('مدیر سیستم')&& !req.user.roles.includes('معاون پژوهشی دانشکده')) {
      return res.status(403).send('شما مجوز حذف فاکتور را ندارید');
    }

    const pool = await sql.connect(config);
    
    // دریافت مسیر فایل قبل از حذف
    const fileResult = await pool.request()
      .input('factorId', sql.Int, factorId)
      .query(`
        SELECT Filepath 
        FROM factors 
        WHERE FactorID = @factorId
      `);

    const filePath = fileResult.recordset[0]?.Filepath;
    
    // حذف فاکتور از دیتابیس
    await pool.request()
      .input('factorId', sql.Int, factorId)
      .query(`
        DELETE FROM factors
        WHERE FactorID = @factorId
      `);

    // حذف فایل از سیستم فایل
    if (filePath) {
      const fullPath = path.join(__dirname, filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    res.status(200).send('فاکتور با موفقیت حذف شد');
  } catch (err) {
    console.error("Error deleting factor:", err);
    res.status(500).send(err.message);
  }
});


// دریافت همه فاکتورها با اطلاعات پایان‌نامه


app.get("/factors/all", authenticate, async (req, res) => {
  try {
      
    const pool = await sql.connect(config);
    const selectedRole = req.user.selectedRole;

    // چک نقش: فقط نقش‌های مجاز
    const allowedRoles = ["مدیر سیستم", "معاون پژوهشی دانشگاه", "کارشناس پژوهشی معاونت پژوهشی", "معاون پژوهشی دانشکده", "کارشناس پژوهشی دانشکده", "عضو هیات علمی"];
    if (!req.user.roles.some(role => allowedRoles.includes(role))) {
      return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }

    if (!selectedRole) {
      return res.status(400).json({ message: 'نقش انتخابی مشخص نشده است.' });
    }

    let query = `
      SELECT 
        t.ThesisID,
        t.Title,
        t.StudentID,
        CONCAT(s.FirstName, ' ', s.LastName) AS StudentName,
        fac.FacultyName,
        d.DepartmentName,
        f.FactorID,
        f.FactorNumber,
        f.FactorDate,
        f.Amount,
        f.Description,
        f.Filepath,
        f.IsConfirmedByExpert,
        f.IsConfirmedByDeputy,
        s.FacultyID,
        s.DepartmentID
      FROM factors f
      JOIN theses t ON f.ThesisID = t.ThesisID
      JOIN students s ON t.StudentID = s.StudentID
      LEFT JOIN faculties fac ON s.FacultyID = fac.FacultyID
      LEFT JOIN departments d ON s.DepartmentID = d.DepartmentID
    `;

    // اگر نقش انتخابی 'عضو هیات علمی' است، فقط فاکتورهای مربوط به پایان‌نامه‌های استاد را نمایش بده
    if (selectedRole === 'عضو هیات علمی') {
      query += `
        JOIN professors_students ps ON t.ThesisID = ps.ThesisID
        WHERE ps.professornationalcode = '${req.user.nationalCode}'
      `;
    }

    // فیلترهای دانشکده و گروه برای نقش‌های خاص
    if (['کارشناس پژوهشی دانشکده', 'معاون پژوهشی دانشکده', 'مدیر گروه'].includes(selectedRole)) {
      const userResult = await pool.request()
        .input('userId', sql.Int, req.user.id)
        .query('SELECT FacultyID, DepartmentID FROM users WHERE id = @userId');
      
      const { FacultyID, DepartmentID } = userResult.recordset[0] || {};
      
      if (FacultyID) {
        query += query.includes('WHERE') ? ' AND' : ' WHERE';
        query += ` s.FacultyID = ${FacultyID}`;
      }
      if (selectedRole === 'مدیر گروه' && DepartmentID) {
        query += query.includes('WHERE') ? ' AND' : ' WHERE';
        query += ` s.DepartmentID = ${DepartmentID}`;
      }
    }

    query += " ORDER BY t.ThesisID, f.FactorDate DESC";

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});




////////////



app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(3001, '0.0.0.0', () => console.log('Server running on port 3001'));