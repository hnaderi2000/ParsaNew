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
const { Console } = require("console");
const { ClimbingBoxLoader } = require("react-spinners");
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


////////////
const signatureStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const { nationalCode } = req.body; // از body می‌گیریم (برای POST جدید)
      let uploadPath;
      if (req.params.id) { // برای PUT (ویرایش)
        const pool = await sql.connect(config);
        const result = await pool.request()
          .input('userId', sql.Int, req.params.id)
          .query('SELECT nationalCode FROM users WHERE id = @userId');
        
        if (result.recordset.length === 0) {
          return cb(new Error('کاربر یافت نشد'));
        }
        
        const userNationalCode = result.recordset[0].nationalCode;
        uploadPath = path.join(__dirname, 'uploads', 'signatures', String(userNationalCode));
      } else { // برای POST (افزودن جدید)
        uploadPath = path.join(__dirname, 'uploads', 'signatures', String(nationalCode));
      }
      
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

const signatureUpload = multer({ 
  storage: signatureStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) { // فقط تصاویر مجاز (JPEG, PNG, etc.)
      cb(null, true);
    } else {
      cb(new Error('فقط فایل‌های تصویری مجاز هستند'), false);
    }
  }
});
////////////
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


//////
// multer مخصوص ویرایش فاکتور (بدون نیاز به thesisId در مسیر)
const editFactorStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const { factorId } = req.params;
      
      // دریافت ThesisID از طریق factorId
      const pool = await sql.connect(config);
      const result = await pool.request()
        .input('factorId', sql.Int, factorId)
        .query(`
          SELECT f.ThesisID, t.StudentID 
          FROM factors f
          JOIN theses t ON f.ThesisID = t.ThesisID
          WHERE f.FactorID = @factorId
        `);
      
      if (result.recordset.length === 0) {
        return cb(new Error('فاکتور یافت نشد'));
      }
      
      const studentId = result.recordset[0].StudentID;
      const uploadPath = path.join(__dirname, 'uploads', 'factors', String(studentId));
      
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

const editFactorUpload = multer({ 
  storage: editFactorStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('فقط فایل‌های PDF و تصاویر مجاز هستند'), false);
    }
  }
});
/////

const RESEARCH_ROLES = [
  "معاون پژوهشی دانشکده",
  "مدیر امور پژوهشی",
  "معاون پژوهشی دانشگاه",
  "کارشناس پژوهشی معاونت پژوهشی",
];


// تابع بررسی تداخل نقش‌ها
const checkRoleConflicts = async (userId, rolesToAssign, facultyId = null, excludeUserId = null) => {
  const conflicts = [];
  
  // نقش‌های منحصر به فرد در کل سیستم
  const uniqueSystemRoles = [
    "مدیر امور پژوهشی",
    "معاون پژوهشی دانشگاه", 
    "کارشناس پژوهشی معاونت پژوهشی"
  ];
  
  // نقش معاون پژوهشی دانشکده (با در نظر گرفتن دانشکده)
  const facultyRole = "معاون پژوهشی دانشکده";
  
  // بررسی نقش‌های منحصر به فرد سیستم
  for (const roleName of uniqueSystemRoles) {
    if (rolesToAssign.includes(roleName)) {
      // دریافت roleId
      const roleResult = await poolConnection.request()
        .input('roleName', sql.NVarChar, roleName)
        .query('SELECT id FROM roles WHERE name = @roleName');
      
      if (roleResult.recordset.length > 0) {
        const roleId = roleResult.recordset[0].id;
        
        // بررسی وجود کاربر دیگر با این نقش
        let conflictQuery = `
          SELECT u.id, u.firstName, u.lastName, u.nationalCode, r.name as roleName
          FROM user_roles ur
          JOIN users u ON ur.user_id = u.id
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.role_id = @roleId
        `;
        
        if (excludeUserId) {
          conflictQuery += ` AND u.id != @excludeUserId`;
        }
        
        const conflictRequest = poolConnection.request()
          .input('roleId', sql.Int, roleId);
        
        if (excludeUserId) {
          conflictRequest.input('excludeUserId', sql.Int, excludeUserId);
        }
        
        const conflictResult = await conflictRequest.query(conflictQuery);
        
        if (conflictResult.recordset.length > 0) {
          conflicts.push({
            roleName: roleName,
            user: conflictResult.recordset[0],
            type: 'system'
          });
        }
      }
    }
  }
  
  // بررسی نقش معاون پژوهشی دانشکده
  if (rolesToAssign.includes(facultyRole) && facultyId) {
    const roleResult = await poolConnection.request()
      .input('roleName', sql.NVarChar, facultyRole)
      .query('SELECT id FROM roles WHERE name = @roleName');
    
    if (roleResult.recordset.length > 0) {
      const roleId = roleResult.recordset[0].id;
      
      // بررسی وجود معاون پژوهشی دیگر برای همان دانشکده
      let conflictQuery = `
        SELECT u.id, u.firstName, u.lastName, u.nationalCode, r.name as roleName, ur.facultyid
        FROM user_roles ur
        JOIN users u ON ur.user_id = u.id
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.role_id = @roleId AND ur.facultyid = @facultyId
      `;
      
      if (excludeUserId) {
        conflictQuery += ` AND u.id != @excludeUserId`;
      }
      
      const conflictRequest = poolConnection.request()
        .input('roleId', sql.Int, roleId)
        .input('facultyId', sql.Int, facultyId);
      
      if (excludeUserId) {
        conflictRequest.input('excludeUserId', sql.Int, excludeUserId);
      }
      
      const conflictResult = await conflictRequest.query(conflictQuery);
      
      if (conflictResult.recordset.length > 0) {
        conflicts.push({
          roleName: facultyRole,
          user: conflictResult.recordset[0],
          type: 'faculty',
          facultyId: facultyId
        });
      }
    }
  }
  
  return conflicts;
};

// تابع کمکی برای دریافت نام نقش‌ها از آرایه roleIds
const getRoleNamesFromIds = async (roleIds) => {
  if (!roleIds || roleIds.length === 0) return [];
  
  const roleNames = [];
  for (const roleId of roleIds) {
    const result = await poolConnection.request()
      .input('roleId', sql.Int, roleId)
      .query('SELECT name FROM roles WHERE id = @roleId');
    
    if (result.recordset.length > 0) {
      roleNames.push(result.recordset[0].name);
    }
  }
  return roleNames;
};
/////////
app.use(cors({
  origin: 'http://localhost:5173',

//origin: 'http://185.105.120.103:5173',
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
let poolConnection = null;
const pool = new sql.ConnectionPool(config);
//const poolConnect = pool.connect();
const poolConnect = pool.connect().then(() => {
    poolConnection = pool;
    console.log('Database connected successfully');
}).catch(err => {
    console.error('Database connection failed:', err);
});





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
      // استفاده از poolConnection به جای اتصال جدید هر بار
      if (!poolConnection) {
        await poolConnect;
      }
      
      const result = await poolConnection.request()
        .input('userId', sql.Int, decoded.id)
        .query(`
          SELECT 
            r.name,
            u.nationalCode,
     
            u.FacultyID, 
            u.DepartmentID 
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          JOIN users u ON ur.user_id = u.id
          WHERE ur.user_id = @userId
        `);
      
      req.user = {
        id: decoded.id,
        nationalCode: decoded.nationalCode || result.recordset[0]?.nationalCode, 
        userName: result.recordset[0]?.userName,
        roles: result.recordset.map(row => row.name),
        selectedRole: decoded.selectedRole,
        facultyID: result.recordset[0]?.FacultyID,
        departmentID: result.recordset[0]?.DepartmentID
      };
      
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
          u.PhoneNumber,
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
       /////  userName: user.userName,
        roles: roles,
        selectedRole: selectedRole, // تنظیم selectedRole به اولین نقش
        facultyID: user.FacultyID, // اضافه کردن FacultyID به توکن
        departmentID: user.DepartmentID // اضافه کردن DepartmentID به توکن
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
      const facultyBasedRoles = ['کارشناس پژوهشی دانشکده', 'معاون پژوهشی دانشکده', 'مدیر گروه','کارشناس مالی دانشکده'];

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




// در endpoint "/users" تغییرات زیر را اعمال کنید:

app.get("/users", authenticate, checkAdminRole, async (req, res) => {
  try {
    await poolConnect;
    
    const { page = 1, limit = 5, search = "", roleId = "" } = req.query; // اضافه کردن roleId
    const offset = (page - 1) * limit;

    // Base query
    let query = `
      SELECT 
        u.id, 
        u.firstName, 
        u.lastName, 
        u.nationalCode, 
        u.userName,
        u.FacultyID,
        u.PhoneNumber,
        u.SignaturePath,
        f.FacultyName,
        u.DepartmentID,
        d.DepartmentName,
        

  
     (
      SELECT TOP 1 facultyid
      FROM user_roles ur2
      WHERE ur2.user_id=u.id
      AND ur2.facultyid IS NOT NULL
  ) AS roleFacultyId,

 
        STUFF((
          SELECT ', ' + r.name
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = u.id
          FOR XML PATH('')
        ), 1, 2, '') AS roles,
        STUFF((
          SELECT ', ' + CAST(r.id AS NVARCHAR(10))
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = u.id
          FOR XML PATH('')
        ), 1, 2, '') AS roleIds
      FROM users u
      LEFT JOIN faculties f ON u.FacultyID = f.FacultyID
      LEFT JOIN departments d ON u.DepartmentID = d.DepartmentID
    `;

    // Add filters
    let whereClauses = [];
    let queryParams = [];
    
    if (search) {
      whereClauses.push(`(u.firstName LIKE @search 
                         OR u.lastName LIKE @search 
                         OR u.nationalCode LIKE @search 
                         OR u.userName LIKE @search)`);
      queryParams.push({ name: 'search', type: sql.NVarChar, value: `%${search}%` });
    }
    
    // اضافه کردن فیلتر نقش
    if (roleId) {
      whereClauses.push(`EXISTS (
        SELECT 1 
        FROM user_roles ur 
        WHERE ur.user_id = u.id AND ur.role_id = @roleId
      )`);
      queryParams.push({ name: 'roleId', type: sql.Int, value: parseInt(roleId) });
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Get total count
    let countQuery = `SELECT COUNT(DISTINCT u.id) as total FROM users u`;
    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    const countRequest = pool.request();
    queryParams.forEach(param => {
      countRequest.input(param.name, param.type, param.value);
    });
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;

    // Add pagination
    query += `
      ORDER BY u.id
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    // Execute main query
    const request = pool.request();
    queryParams.forEach(param => {
      request.input(param.name, param.type, param.value);
    });
    const result = await request.query(query);

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

// app.post("users", authenticate, checkAdminRole, signatureUpload.single('signature'), async (req, res) => {
//   await poolConnect;
//   const transaction = new sql.Transaction(pool);
  
//   try {
//     const { firstName, lastName, nationalCode, userName, password, roles, facultyId, departmentId, phoneNumber,  roleStartDate,
// roleEndDate } = req.body;
    
//     // اعتبارسنجی
//     if (!firstName || !lastName || !nationalCode || !userName || !password) {
//       return res.status(400).json({ message: "تمام فیلدهای الزامی (نام، نام خانوادگی، کد ملی، نام کاربری، رمز عبور) باید پر شوند" });
//     }

//     // بررسی یکتایی nationalCode و userName
//     const pool = await sql.connect(config);
//     const checkResult = await pool.request()
//       .input('nationalCode', sql.NVarChar(10), nationalCode)
//       .input('userName', sql.NVarChar(50), userName)
//       .query(`
//         SELECT id FROM users 
//         WHERE nationalCode = @nationalCode OR userName = @userName
//       `);
    
//     if (checkResult.recordset.length > 0) {
//       return res.status(400).json({ message: "کد ملی یا نام کاربری قبلاً استفاده شده است" });
//     }

//     // هش کردن رمز عبور
//     const hashedPassword = await bcrypt.hash(password, saltRounds);

//     await transaction.begin();
    
//     const request = transaction.request()
//       .input('firstName', sql.NVarChar(50), firstName)
//       .input('lastName', sql.NVarChar(50), lastName)
//       .input('nationalCode', sql.NVarChar(10), nationalCode)
//       .input('userName', sql.NVarChar(50), userName)
//       .input('password', sql.NVarChar(255), hashedPassword)
//       .input('facultyId', sql.Int, facultyId ? parseInt(facultyId) : null)
//       .input('departmentId', sql.Int, departmentId ? parseInt(departmentId) : null)
//       .input('phoneNumber', sql.NChar(11), phoneNumber || null)
//       .input('signaturePath', sql.NVarChar(255), null); // ابتدا null

//     const result = await request.query(`
//       INSERT INTO users (firstName, lastName, nationalCode, userName, password, FacultyID, DepartmentID, PhoneNumber, SignaturePath)
//       VALUES (@firstName, @lastName, @nationalCode, @userName, @password, @facultyId, @departmentId, @phoneNumber, @signaturePath);
//       SELECT SCOPE_IDENTITY() AS id;
//     `);
    
//     const newUserId = result.recordset[0].id;

//     // ذخیره نقش‌ها
//     // if (roles && Array.isArray(JSON.parse(roles))) {
//     //   const parsedRoles = JSON.parse(roles);
//     //   for (const roleId of parsedRoles) {
//     //     await transaction.request()
//     //       .input('userId', sql.Int, newUserId)
//     //       .input('roleId', sql.Int, roleId)
//     //       .query(`
//     //         INSERT INTO user_roles (user_id, role_id)
//     //         VALUES (@userId, @roleId)
//     //       `);
//     //   }
//     // }


//     if (roles && Array.isArray(JSON.parse(roles))) {

//   const parsedRoles = JSON.parse(roles);

//   for (const roleId of parsedRoles) {

//     const roleResult = await transaction.request()
//       .input("roleId", sql.Int, roleId)
//       .query(`
//         SELECT id,name
//         FROM roles
//         WHERE id=@roleId
//       `);

//     const roleName = roleResult.recordset[0]?.name || "";

//     const isResearchRole =
//       RESEARCH_ROLES.includes(roleName);

//     await transaction.request()
//       .input("userId", sql.Int, newUserId)
//       .input("roleId", sql.Int, roleId)
//       .input(
//         "startdate",
//         sql.NChar(10),
//         isResearchRole
//           ? (roleStartDate || null)
//           : null
//       )
//       .input(
//         "enddate",
//         sql.NChar(10),
//         isResearchRole
//           ? (roleEndDate || null)
//           : null
//       )
//       .input(
//         "facultyid",
//         sql.Int,
//         roleName === "معاون پژوهشی دانشکده"
//           ? (facultyId ? parseInt(facultyId) : null)
//           : null
//       )
//       .query(`
//         INSERT INTO user_roles
//         (
//           user_id,
//           role_id,
//           startdate,
//           enddate,
//           facultyid
//         )
//         VALUES
//         (
//           @userId,
//           @roleId,
//           @startdate,
//           @enddate,
//           @facultyid
//         )
//       `);
//   }
// }
//     // ذخیره مسیر امضا
//     let signaturePath = null;
//     if (req.file) {
//       signaturePath = `/uploads/signatures/${nationalCode}/${req.file.filename}`;
//       await transaction.request()
//         .input('id', sql.Int, newUserId)
//         .input('signaturePath', sql.NVarChar(255), signaturePath)
//         .query('UPDATE users SET SignaturePath = @signaturePath WHERE id = @id');
//     }
    
//     await transaction.commit();
//     res.status(201).json({ message: "کاربر با موفقیت اضافه شد" });
//   } catch (err) {
//     await transaction.rollback();
//     console.error("SQL error:", err);
//     res.status(500).json({ message: err.message });
//   }
// });
// جایگزینی endpoint POST /users با نسخه جدید
app.post("/users", authenticate, checkAdminRole, signatureUpload.single('signature'), async (req, res) => {
  await poolConnect;
  const transaction = new sql.Transaction(pool);
  
  try {
    const { firstName, lastName, nationalCode, userName, password, roles, facultyId, departmentId, phoneNumber } = req.body;
    
    // اعتبارسنجی
    if (!firstName || !lastName || !nationalCode || !userName || !password) {
      return res.status(400).json({ message: "تمام فیلدهای الزامی (نام، نام خانوادگی، کد ملی، نام کاربری، رمز عبور) باید پر شوند" });
    }

    // بررسی یکتایی nationalCode و userName
    const checkResult = await pool.request()
      .input('nationalCode', sql.NVarChar(10), nationalCode)
      .input('userName', sql.NVarChar(50), userName)
      .query(`
        SELECT id FROM users 
        WHERE nationalCode = @nationalCode OR userName = @userName
      `);
    
    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ message: "کد ملی یا نام کاربری قبلاً استفاده شده است" });
    }

    // دریافت نام نقش‌های انتخاب شده
    const parsedRoles = JSON.parse(roles);
    const roleNames = await getRoleNamesFromIds(parsedRoles);
    
    // بررسی تداخل نقش‌ها
    const conflicts = await checkRoleConflicts(null, roleNames, facultyId ? parseInt(facultyId) : null);
    
    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      let errorMessage = '';
      
      if (conflict.type === 'system') {
        errorMessage = `❌ نقش "${conflict.roleName}" قبلاً به کاربر "${conflict.user.firstName} ${conflict.user.lastName}" (کد ملی: ${conflict.user.nationalCode}) اختصاص دارد. برای اختصاص این نقش به کاربر جدید، ابتدا باید نقش مذکور از کاربر قبلی حذف شود.`;
      } else if (conflict.type === 'faculty') {
        errorMessage = `❌ نقش "معاون پژوهشی دانشکده" برای این دانشکده قبلاً به کاربر "${conflict.user.firstName} ${conflict.user.lastName}" (کد ملی: ${conflict.user.nationalCode}) اختصاص دارد. برای اختصاص این نقش به کاربر جدید، ابتدا باید نقش مذکور از کاربر قبلی حذف شود.`;
      }
      
      return res.status(409).json({ 
        message: errorMessage,
        conflict: conflict
      });
    }

    // هش کردن رمز عبور
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await transaction.begin();
    
    const request = transaction.request()
      .input('firstName', sql.NVarChar(50), firstName)
      .input('lastName', sql.NVarChar(50), lastName)
      .input('nationalCode', sql.NVarChar(10), nationalCode)
      .input('userName', sql.NVarChar(50), userName)
      .input('password', sql.NVarChar(255), hashedPassword)
      .input('facultyId', sql.Int, facultyId ? parseInt(facultyId) : null)
      .input('departmentId', sql.Int, departmentId ? parseInt(departmentId) : null)
      .input('phoneNumber', sql.NChar(11), phoneNumber || null)
      .input('signaturePath', sql.NVarChar(255), null);

    const result = await request.query(`
      INSERT INTO users (firstName, lastName, nationalCode, userName, password, FacultyID, DepartmentID, PhoneNumber, SignaturePath)
      VALUES (@firstName, @lastName, @nationalCode, @userName, @password, @facultyId, @departmentId, @phoneNumber, @signaturePath);
      SELECT SCOPE_IDENTITY() AS id;
    `);
    
    const newUserId = result.recordset[0].id;

    // ذخیره نقش‌ها
    if (roles && Array.isArray(parsedRoles)) {
      for (const roleId of parsedRoles) {
        const roleResult = await transaction.request()
          .input("roleId", sql.Int, roleId)
          .query(`SELECT id, name FROM roles WHERE id = @roleId`);

        const roleName = roleResult.recordset[0]?.name || "";
        const isResearchRole = RESEARCH_ROLES.includes(roleName);

        await transaction.request()
          .input("userId", sql.Int, newUserId)
          .input("roleId", sql.Int, roleId)
          .input("facultyid", sql.Int, roleName === "معاون پژوهشی دانشکده" ? (facultyId ? parseInt(facultyId) : null) : null)
          .query(`
            INSERT INTO user_roles (user_id, role_id,  facultyid)
            VALUES (@userId, @roleId, @facultyid)
          `);
      }
    }
    
    // ذخیره مسیر امضا
    let signaturePath = null;
    if (req.file) {
      signaturePath = `/uploads/signatures/${nationalCode}/${req.file.filename}`;
      await transaction.request()
        .input('id', sql.Int, newUserId)
        .input('signaturePath', sql.NVarChar(255), signaturePath)
        .query('UPDATE users SET SignaturePath = @signaturePath WHERE id = @id');
    }
    
    await transaction.commit();
    res.status(201).json({ message: "کاربر با موفقیت اضافه شد" });
  } catch (err) {
    await transaction.rollback();
    console.error("SQL error:", err);
    res.status(500).json({ message: err.message });
  }
});



// app.put("/users/:id", authenticate, checkAdminRole, signatureUpload.single('signature'), async (req, res) => {
//   await poolConnect;
//   const transaction = new sql.Transaction(pool);
  
//   try {
//     const { id } = req.params;
//     const { firstName, lastName, nationalCode, userName, password, roles, facultyId, departmentId, phoneNumber,roleStartDate,
//   roleEndDate } = req.body;
    
//     // اعتبارسنجی
//     if (!firstName || !lastName || !nationalCode || !userName) {
//       return res.status(400).json({ message: "تمام فیلدهای الزامی (نام، نام خانوادگی، کد ملی، نام کاربری) باید پر شوند" });
//     }

//     // بررسی یکتایی nationalCode و userName (به جز کاربر فعلی)
//     const pool = await sql.connect(config);
//     const checkResult = await pool.request()
//       .input('id', sql.Int, id)
//       .input('nationalCode', sql.NVarChar(10), nationalCode)
//       .input('userName', sql.NVarChar(50), userName)
//       .query(`
//         SELECT id FROM users 
//         WHERE (nationalCode = @nationalCode OR userName = @userName)
//         AND id != @id
//       `);
    
//     if (checkResult.recordset.length > 0) {
//       return res.status(400).json({ message: "کد ملی یا نام کاربری قبلاً استفاده شده است" });
//     }

//     await transaction.begin();
    
//     // آماده‌سازی query آپدیت
//     const request = transaction.request()
//       .input('id', sql.Int, id)
//       .input('firstName', sql.NVarChar(50), firstName)
//       .input('lastName', sql.NVarChar(50), lastName)
//       .input('nationalCode', sql.NVarChar(10), nationalCode)
//       .input('userName', sql.NVarChar(50), userName)
//       .input('facultyId', sql.Int, facultyId ? parseInt(facultyId) : null)
//       .input('departmentId', sql.Int, departmentId ? parseInt(departmentId) : null)
//       .input('phoneNumber', sql.NChar(11), phoneNumber || null);

//     let query = `
//       UPDATE users 
//       SET 
//         firstName = @firstName,
//         lastName = @lastName,
//         nationalCode = @nationalCode,
//         userName = @userName,
//         FacultyID = @facultyId,
//         DepartmentID = @departmentId,
//         PhoneNumber = @phoneNumber
//     `;

//     // اگر رمز عبور جدید ارائه شده، هش کن و اضافه کن
//     if (password) {
//       const hashedPassword = await bcrypt.hash(password, saltRounds);
//       request.input('password', sql.NVarChar(255), hashedPassword);
//       query += `, password = @password`;
//     }

//     // اگر فایل امضا آپلود شده، مسیر جدید رو ست کن و فایل قدیمی رو حذف کن
//     let signaturePath = null;
//     if (req.file) {
//       const oldPathResult = await pool.request()
//         .input('id', sql.Int, id)
//         .query('SELECT SignaturePath FROM users WHERE id = @id');
//       const oldPath = oldPathResult.recordset[0]?.SignaturePath;
//       if (oldPath && fs.existsSync(path.join(__dirname, oldPath))) {
//         fs.unlinkSync(path.join(__dirname, oldPath));
//       }
      
//       const userResult = await pool.request()
//         .input('id', sql.Int, id)
//         .query('SELECT nationalCode FROM users WHERE id = @id');
//       const userNationalCode = userResult.recordset[0].nationalCode;
//       signaturePath = `/uploads/signatures/${userNationalCode}/${req.file.filename}`;
//       request.input('signaturePath', sql.NVarChar(255), signaturePath);
//       query += `, SignaturePath = @signaturePath`;
//     }

//     query += ` WHERE id = @id`;

//     const result = await request.query(query);

//     if (result.rowsAffected[0] === 0) {
//       await transaction.rollback();
//       return res.status(404).json({ message: "کاربر یافت نشد" });
//     }

//     // آپدیت نقش‌ها
//     // if (roles && Array.isArray(JSON.parse(roles))) {
//     //   await transaction.request()
//     //     .input('userId', sql.Int, id)
//     //     .query('DELETE FROM user_roles WHERE user_id = @userId');
      
//     //   const parsedRoles = JSON.parse(roles);
//     //   for (const roleId of parsedRoles) {
//     //     await transaction.request()
//     //       .input('userId', sql.Int, id)
//     //       .input('roleId', sql.Int, roleId)
//     //       .query(`
//     //         INSERT INTO user_roles (user_id, role_id)
//     //         VALUES (@userId, @roleId)
//     //       `);
//     //   }
//     // }

//     if (roles && Array.isArray(JSON.parse(roles))) {

//   await transaction.request()
//     .input("userId", sql.Int, id)
//     .query(`
//       DELETE FROM user_roles
//       WHERE user_id=@userId
//     `);

//   const parsedRoles = JSON.parse(roles);

//   for (const roleId of parsedRoles) {

//     const roleResult = await transaction.request()
//       .input("roleId", sql.Int, roleId)
//       .query(`
//         SELECT id,name
//         FROM roles
//         WHERE id=@roleId
//       `);

//     const roleName = roleResult.recordset[0]?.name || "";

//     const isResearchRole =
//       RESEARCH_ROLES.includes(roleName);

//     await transaction.request()
//       .input("userId", sql.Int, id)
//       .input("roleId", sql.Int, roleId)
//       .input(
//         "startdate",
//         sql.NChar(10),
//         isResearchRole
//           ? (roleStartDate || null)
//           : null
//       )
//       .input(
//         "enddate",
//         sql.NChar(10),
//         isResearchRole
//           ? (roleEndDate || null)
//           : null
//       )
//       .input(
//         "facultyid",
//         sql.Int,
//         roleName === "معاون پژوهشی دانشکده"
//           ? (facultyId ? parseInt(facultyId) : null)
//           : null
//       )
//       .query(`
//         INSERT INTO user_roles
//         (
//           user_id,
//           role_id,
//           startdate,
//           enddate,
//           facultyid
//         )
//         VALUES
//         (
//           @userId,
//           @roleId,
//           @startdate,
//           @enddate,
//           @facultyid
//         )
//       `);
//   }
// }

//     await transaction.commit();
//     res.status(200).json({ message: "کاربر با موفقیت ویرایش شد" });
//   } catch (err) {
//     await transaction.rollback();
//     console.error("SQL error:", err);
//     res.status(500).json({ message: err.message });
//   }
// });

// جایگزینی endpoint PUT /users/:id با نسخه جدید
app.put("/users/:id", authenticate, checkAdminRole, signatureUpload.single('signature'), async (req, res) => {
  await poolConnect;
  const transaction = new sql.Transaction(pool);
  
  try {
    const { id } = req.params;
    const { firstName, lastName, nationalCode, userName, password, roles, facultyId, departmentId, phoneNumber } = req.body;
    
    // اعتبارسنجی
    if (!firstName || !lastName || !nationalCode || !userName) {
      return res.status(400).json({ message: "تمام فیلدهای الزامی (نام، نام خانوادگی، کد ملی، نام کاربری) باید پر شوند" });
    }

    // بررسی یکتایی nationalCode و userName (به جز کاربر فعلی)
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .input('nationalCode', sql.NVarChar(10), nationalCode)
      .input('userName', sql.NVarChar(50), userName)
      .query(`
        SELECT id FROM users 
        WHERE (nationalCode = @nationalCode OR userName = @userName)
        AND id != @id
      `);
    
    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ message: "کد ملی یا نام کاربری قبلاً استفاده شده است" });
    }

    // دریافت نام نقش‌های انتخاب شده
    const parsedRoles = JSON.parse(roles);
    const roleNames = await getRoleNamesFromIds(parsedRoles);
    
    // بررسی تداخل نقش‌ها (به جز کاربر فعلی)
    const conflicts = await checkRoleConflicts(id, roleNames, facultyId ? parseInt(facultyId) : null, parseInt(id));
    
    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      let errorMessage = '';
      
      if (conflict.type === 'system') {
        errorMessage = `❌ نقش "${conflict.roleName}" قبلاً به کاربر "${conflict.user.firstName} ${conflict.user.lastName}" (کد ملی: ${conflict.user.nationalCode}) اختصاص دارد. برای اختصاص این نقش به کاربر جدید، ابتدا باید نقش مذکور از کاربر قبلی حذف شود.`;
      } else if (conflict.type === 'faculty') {
        errorMessage = `❌ نقش "معاون پژوهشی دانشکده" برای این دانشکده قبلاً به کاربر "${conflict.user.firstName} ${conflict.user.lastName}" (کد ملی: ${conflict.user.nationalCode}) اختصاص دارد. برای اختصاص این نقش به کاربر جدید، ابتدا باید نقش مذکور از کاربر قبلی حذف شود.`;
      }
      
      return res.status(409).json({ 
        message: errorMessage,
        conflict: conflict
      });
    }

    await transaction.begin();
    
    // آماده‌سازی query آپدیت
    const request = transaction.request()
      .input('id', sql.Int, id)
      .input('firstName', sql.NVarChar(50), firstName)
      .input('lastName', sql.NVarChar(50), lastName)
      .input('nationalCode', sql.NVarChar(10), nationalCode)
      .input('userName', sql.NVarChar(50), userName)
      .input('facultyId', sql.Int, facultyId ? parseInt(facultyId) : null)
      .input('departmentId', sql.Int, departmentId ? parseInt(departmentId) : null)
      .input('phoneNumber', sql.NChar(11), phoneNumber || null);

    let query = `
      UPDATE users 
      SET 
        firstName = @firstName,
        lastName = @lastName,
        nationalCode = @nationalCode,
        userName = @userName,
        FacultyID = @facultyId,
        DepartmentID = @departmentId,
        PhoneNumber = @phoneNumber
    `;

    // اگر رمز عبور جدید ارائه شده، هش کن و اضافه کن
    if (password) {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      request.input('password', sql.NVarChar(255), hashedPassword);
      query += `, password = @password`;
    }

    // اگر فایل امضا آپلود شده، مسیر جدید رو ست کن و فایل قدیمی رو حذف کن
    let signaturePath = null;
    if (req.file) {
      const oldPathResult = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT SignaturePath FROM users WHERE id = @id');
      const oldPath = oldPathResult.recordset[0]?.SignaturePath;
      if (oldPath && fs.existsSync(path.join(__dirname, oldPath))) {
        fs.unlinkSync(path.join(__dirname, oldPath));
      }
      
      const userResult = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT nationalCode FROM users WHERE id = @id');
      const userNationalCode = userResult.recordset[0].nationalCode;
      signaturePath = `/uploads/signatures/${userNationalCode}/${req.file.filename}`;
      request.input('signaturePath', sql.NVarChar(255), signaturePath);
      query += `, SignaturePath = @signaturePath`;
    }

    query += ` WHERE id = @id`;

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: "کاربر یافت نشد" });
    }

    // آپدیت نقش‌ها
    if (roles && Array.isArray(parsedRoles)) {
      await transaction.request()
        .input("userId", sql.Int, id)
        .query(`DELETE FROM user_roles WHERE user_id = @userId`);

      for (const roleId of parsedRoles) {
        const roleResult = await transaction.request()
          .input("roleId", sql.Int, roleId)
          .query(`SELECT id, name FROM roles WHERE id = @roleId`);

        const roleName = roleResult.recordset[0]?.name || "";
        const isResearchRole = RESEARCH_ROLES.includes(roleName);

        await transaction.request()
          .input("userId", sql.Int, id)
          .input("roleId", sql.Int, roleId)
          
          .input("facultyid", sql.Int, roleName === "معاون پژوهشی دانشکده" ? (facultyId ? parseInt(facultyId) : null) : null)
          .query(`
            INSERT INTO user_roles (user_id, role_id,  facultyid)
            VALUES (@userId, @roleId, @facultyid)
          `);
      }
    }

    await transaction.commit();
    res.status(200).json({ message: "کاربر با موفقیت ویرایش شد" });
  } catch (err) {
    await transaction.rollback();
    console.error("SQL error:", err);
    res.status(500).json({ message: err.message });
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
  await poolConnect;
  const transaction = new sql.Transaction(pool);
  
  try {
    const { id } = req.params;

    await transaction.begin();

    // بررسی وجود کاربر و گرفتن SignaturePath و nationalCode
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT SignaturePath, nationalCode FROM users WHERE id = @id');
    
    if (result.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: "کاربر مورد نظر یافت نشد" });
    }

    const signaturePath = result.recordset[0].SignaturePath;
    const nationalCode = result.recordset[0].nationalCode;

    // حذف فایل امضا اگر وجود داشته باشد
    if (signaturePath && fs.existsSync(path.join(__dirname, signaturePath))) {
      try {
        fs.unlinkSync(path.join(__dirname, signaturePath));
      } catch (fileErr) {
        console.error("Error deleting signature file:", fileErr);
        await transaction.rollback();
        return res.status(500).json({ message: "خطا در حذف فایل امضا" });
      }
    }

    // حذف پوشه امضا اگر خالی باشد
    if (nationalCode) {
      const signatureFolder = path.join(__dirname, 'Uploads', 'signatures', String(nationalCode));
      if (fs.existsSync(signatureFolder)) {
        try {
          const files = fs.readdirSync(signatureFolder);
          if (files.length === 0) {
            fs.rmdirSync(signatureFolder);
          }
        } catch (folderErr) {
          console.error("Error checking or deleting signature folder:", folderErr);
          await transaction.rollback();
          return res.status(500).json({ message: "خطا در حذف پوشه امضا" });
        }
      }
    }

    // حذف نقش‌های کاربر از جدول user_roles
    await transaction.request()
      .input('userId', sql.Int, id)
      .query('DELETE FROM user_roles WHERE user_id = @userId');

    // حذف کاربر از جدول users
    const deleteResult = await transaction.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM users WHERE id = @id');

    if (deleteResult.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: "کاربر مورد نظر یافت نشد" });
    }

    await transaction.commit();
    res.status(200).json({ message: "کاربر، فایل امضا و پوشه مرتبط (در صورت خالی بودن) با موفقیت حذف شد" });
  } catch (err) {
    await transaction.rollback();
    console.error("SQL error:", err);
    res.status(500).json({ message: err.message });
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


// endpoint برای دریافت متغیرهای سیستم بر اساس سال شمسی (با فرمت 4 رقمی)
app.get("/systemvariables/by-year/:year", async (req, res) => {
  try {
    const { year } = req.params;
    let pool = await sql.connect(config);
    const result = await pool.request()
      .input('year', sql.Int, parseInt(year))
      .query(`
        SELECT * FROM VariableSettings
        WHERE year = @year
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        message: "هیچ متغیر سیستمی برای این سال یافت نشد",
        year: year 
      });
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
          s.LevelID,
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
    // اطمینان از اتصال دیتابیس
    if (!poolConnection) {
      await poolConnect;
    }
    
    const selectedRole = req.user.selectedRole;
    const { startDate, endDate } = req.query;
    
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
        t.SystemRegistrationDate,
        t.ExpiryDate,  
        s.FirstName + ' ' + s.LastName as StudentName,
        el.LevelName,
        el.LevelID,
        f.FacultyID,  
        f.FacultyName,
        d.DepartmentID,  
        d.DepartmentName,
        t.Deputy_Confirmation,
        t.Deputy_Expert_Confirmation,
        t.Deputy_Expert_Confirmation_First,
        t.Deputy_Expert_Confirmation_Second,
        t.ApprovalDate
      FROM theses t
      JOIN students s ON t.StudentID = s.StudentID
      LEFT JOIN educationlevels el ON t.LevelID = el.LevelID
      LEFT JOIN faculties f ON s.FacultyID = f.FacultyID
      LEFT JOIN departments d ON s.DepartmentID = d.DepartmentID
    `;
    
    let whereConditions = [];
    let queryParams = [];
    
    if (startDate && endDate) {
      whereConditions.push(`t.SystemRegistrationDate BETWEEN @startDate AND @endDate`);
      queryParams.push({ name: 'startDate', type: sql.NVarChar(10), value: startDate });
      queryParams.push({ name: 'endDate', type: sql.NVarChar(10), value: endDate });
    }
    
    if (selectedRole === 'عضو هیات علمی') {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM professors_students ps 
        WHERE ps.ThesisID = t.ThesisID AND ps.professornationalcode = @nationalCode
      )`);
      queryParams.push({ name: 'nationalCode', type: sql.NVarChar(10), value: req.user.nationalCode });
    }
    
    if (['کارشناس پژوهشی دانشکده', 'معاون پژوهشی دانشکده', 'مدیر گروه'].includes(selectedRole)) {
      const userResult = await poolConnection.request()
        .input('userId', sql.Int, req.user.id)
        .query('SELECT FacultyID, DepartmentID FROM users WHERE id = @userId');
      
      const { FacultyID, DepartmentID } = userResult.recordset[0] || {};
      
      if (FacultyID) {
        whereConditions.push(`s.FacultyID = @facultyId`);
        queryParams.push({ name: 'facultyId', type: sql.Int, value: FacultyID });
      }
      if (selectedRole === 'مدیر گروه' && DepartmentID) {
        whereConditions.push(`s.DepartmentID = @departmentId`);
        queryParams.push({ name: 'departmentId', type: sql.Int, value: DepartmentID });
      }
    }
    
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    query += " ORDER BY t.ThesisID DESC";
    
    const request = poolConnection.request();
    queryParams.forEach(param => {
      request.input(param.name, param.type, param.value);
    });
    
    const result = await request.query(query);
    
    // برای هر پایان‌نامه، اساتید مربوطه را دریافت کنید
    const thesesWithProfessors = await Promise.all(
      result.recordset.map(async (thesis) => {
        const profResult = await poolConnection.request()
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


// // ثبت پایان‌نامه جدید


// Backend code - POST /theses endpoint
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
      parsaType,
      approvalDate,
      systemRegistrationDate
    } = req.body;

    // اعتبارسنجی نقش کاربر
    if (!req.user.roles.includes('مدیر سیستم') && !req.user.roles.includes('کارشناس پژوهشی دانشکده')) {
      return res.status(403).send('شما مجوز ثبت پایان‌نامه را ندارید');
    }

    // اعتبارسنجی فیلدها
    if (!studentId || !title || !thesisType || !levelId || !professors || professors.length == 0 || !approvalDate || !systemRegistrationDate) {
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
      .input('studentId', sql.NVarChar(10), studentId)
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
      .input('StudentID', sql.NVarChar(10), studentId)
      .input('Title', sql.NVarChar, title)
      .input('ThesisType', sql.NVarChar, thesisType)
      .input('LevelID', sql.Int, levelId)
      .input('ApprovedAmount', sql.Int, ApprovedAmount)
      .input('ApprovalDate', sql.NVarChar(10), approvalDate)
      .input('SystemRegistrationDate', sql.NVarChar(10), systemRegistrationDate)
      .input('ParsaType', sql.NVarChar(1), parsaType)
      .query(`
        INSERT INTO theses (StudentID, Title, ThesisType, LevelID, ApprovedAmount, ApprovalDate, SystemRegistrationDate, ParsaType)
        OUTPUT INSERTED.ThesisID
        VALUES (@StudentID, @Title, @ThesisType, @LevelID, @ApprovedAmount, @ApprovalDate, @SystemRegistrationDate, @ParsaType)
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
    
    if (checkResult.recordset.length == 0) {
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


// تایید/رد پایان‌نامه توسط کارشناس پژوهشی معاونت پژوهشی
app.put("/theses/:thesisId/expert-confirm", authenticate, async (req, res) => {
  try {
    const { thesisId } = req.params;
    const { confirm } = req.body;

    // بررسی نقش کاربر
    if (!req.user.roles.includes('کارشناس پژوهشی معاونت پژوهشی')) {
      return res.status(403).send('شما مجوز تایید پایان‌نامه را ندارید');
    }

    const pool = await sql.connect(config);

    // بررسی اینکه معاون پژوهشی دانشکده قبلاً تایید کرده باشد
    const checkResult = await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .query(`
        SELECT Deputy_Confirmation
        FROM theses
        WHERE ThesisID = @thesisId
      `);

    if (checkResult.recordset.length == 0) {
      return res.status(404).send('پایان‌نامه مورد نظر یافت نشد');
    }

    const deputyConfirmed = checkResult.recordset[0].Deputy_Confirmation;
    if (!deputyConfirmed) {
      return res.status(400).send('پایان‌نامه هنوز توسط معاون پژوهشی دانشکده تایید نشده است');
    }

    // به‌روزرسانی وضعیت تایید کارشناس پژوهشی معاونت پژوهشی
    await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .input('confirm', sql.Bit, confirm?confirm:null)
      .query(`
        UPDATE theses
        SET Deputy_Expert_Confirmation = @confirm
        WHERE ThesisID = @thesisId
      `);

    // ثبت تاریخچه
    const action = confirm ? 'تایید' : 'رد';
    await addThesisHistory(
      thesisId,
      `${action} پرداخت وجه پایان نامه `,
      `پایان‌نامه توسط کارشناس پژوهشی معاونت پژوهشی ${action} شد`,
      req.user.id
    );

    res.status(200).send(confirm ? 'پایان‌نامه با موفقیت تایید شد' : 'تایید پایان‌نامه لغو شد');
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});


// تایید/رد 50% اول توسط کارشناس پژوهشی معاونت پژوهشی
app.put("/theses/:thesisId/expert-confirm-first50", authenticate, async (req, res) => {
  try {
    const { thesisId } = req.params;
    const { confirm } = req.body;

    // بررسی نقش کاربر
    if (!req.user.roles.includes('کارشناس پژوهشی معاونت پژوهشی')) {
      return res.status(403).send('شما مجوز تایید 50% اول پایان‌نامه را ندارید');
    }

    const pool = await sql.connect(config);

    // بررسی اینکه معاون پژوهشی دانشکده قبلاً تایید کرده باشد
    const checkResult = await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .query(`
        SELECT Deputy_Confirmation, LevelName
        FROM theses t
        JOIN educationlevels el ON t.LevelID = el.LevelID
        WHERE ThesisID = @thesisId
      `);

    if (checkResult.recordset.length == 0) {
      return res.status(404).send('پایان‌نامه مورد نظر یافت نشد');
    }

    const { Deputy_Confirmation, LevelName } = checkResult.recordset[0];
    
    // بررسی اینکه پایان‌نامه از نوع PHD باشد
    if (LevelName !== 'PHD') {
      return res.status(400).send('این عملیات فقط برای پایان‌نامه‌های PHD مجاز است');
    }

    if (!Deputy_Confirmation) {
      return res.status(400).send('پایان‌نامه هنوز توسط معاون پژوهشی دانشکده تایید نشده است');
    }

    // به‌روزرسانی وضعیت تایید 50% اول
    await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .input('confirm', sql.Bit, confirm?confirm:null)
      .query(`
        UPDATE theses
        SET Deputy_Expert_Confirmation_First = @confirm
        WHERE ThesisID = @thesisId
      `);

    // ثبت تاریخچه
    const action = confirm ? 'تایید' : 'رد';
    await addThesisHistory(
      thesisId,
      `${action} 50% اول پرداخت وجه پایان‌نامه`,
      `50% اول پرداخت وجه پایان‌نامه توسط کارشناس پژوهشی معاونت پژوهشی ${action} شد`,
      req.user.id
    );

    res.status(200).send(confirm ? '50% اول پایان‌نامه با موفقیت تایید شد' : 'تایید 50% اول پایان‌نامه لغو شد');
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

// تایید/رد 50% دوم توسط کارشناس پژوهشی معاونت پژوهشی
app.put("/theses/:thesisId/expert-confirm-second50", authenticate, async (req, res) => {
  try {
    const { thesisId } = req.params;
    const { confirm } = req.body;

    // بررسی نقش کاربر
    if (!req.user.roles.includes('کارشناس پژوهشی معاونت پژوهشی')) {
      return res.status(403).send('شما مجوز تایید 50% دوم پایان‌نامه را ندارید');
    }

    const pool = await sql.connect(config);

    // بررسی اینکه معاون پژوهشی دانشکده و 50% اول قبلاً تایید شده باشند
    const checkResult = await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .query(`
        SELECT Deputy_Confirmation, Deputy_Expert_Confirmation_First, LevelName
        FROM theses t
        JOIN educationlevels el ON t.LevelID = el.LevelID
        WHERE ThesisID = @thesisId
      `);

    if (checkResult.recordset.length == 0) {
      return res.status(404).send('پایان‌نامه مورد نظر یافت نشد');
    }

    const { Deputy_Confirmation, Deputy_Expert_Confirmation_First, LevelName } = checkResult.recordset[0];

    // بررسی اینکه پایان‌نامه از نوع PHD باشد
    if (LevelName !== 'PHD') {
      return res.status(400).send('این عملیات فقط برای پایان‌نامه‌های PHD مجاز است');
    }

    if (!Deputy_Confirmation) {
      return res.status(400).send('پایان‌نامه هنوز توسط معاون پژوهشی دانشکده تایید نشده است');
    }

    if (!Deputy_Expert_Confirmation_First) {
      return res.status(400).send('50% اول هنوز تایید نشده است');
    }

    // به‌روزرسانی وضعیت تایید 50% دوم
    await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .input('confirm', sql.Bit, confirm?confirm:null)
      .query(`
        UPDATE theses
        SET Deputy_Expert_Confirmation_Second = @confirm
        WHERE ThesisID = @thesisId
      `);

    // ثبت تاریخچه
    const action = confirm ? 'تایید' : 'رد';
    await addThesisHistory(
      thesisId,
      `${action} 50% دوم پرداخت وجه پایان‌نامه`,
      `50% دوم پرداخت وجه پایان‌نامه توسط کارشناس پژوهشی معاونت پژوهشی ${action} شد`,
      req.user.id
    );

    res.status(200).send(confirm ? '50% دوم پایان‌نامه با موفقیت تایید شد' : 'تایید 50% دوم پایان‌نامه لغو شد');
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

//ویرایش پایان نامه

// ویرایش پایان نامه
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
      studentId,
      approvedAmount,  // اضافه شده: مبلغ مصوب جدید
       parsaType  // اضافه شده: نوع پارسا (پایان‌نامه یا رساله)
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

    // اعتبارسنجی مبلغ مصوب (اختیاری)
    if (approvedAmount !== undefined && (isNaN(approvedAmount) || approvedAmount < 0)) {
      return res.status(400).send("مبلغ مصوب نامعتبر است");
    }

    await transaction.begin();

    // ساخت کوئری به‌روزرسانی با در نظر گرفتن فیلدهای اختیاری
    let updateQuery = `
      UPDATE theses 
      SET 
        Title = @Title,
        ThesisType = @thesisType,
        LevelID = @levelId
    `;
    // اضافه کردن ParsaType به کوئری در صورت وجود
    if (parsaType) {
      updateQuery += `, ParsaType = @parsaType`;
    }
    // اگر approvedAmount در درخواست وجود داشته باشد، آن را به‌روزرسانی کن
    if (approvedAmount !== undefined) {
      updateQuery += `, ApprovedAmount = @approvedAmount`;
    }
    
    updateQuery += ` WHERE ThesisID = @thesisId`;

    const updateRequest = transaction.request()
      .input('thesisId', sql.Int, thesisId)
      .input('Title', sql.NVarChar, title)
      .input('thesisType', sql.NVarChar, thesisType)
      .input('levelId', sql.Int, levelId);

      // اضافه کردن پارامتر parsaType در صورت وجود
    if (parsaType) {
      updateRequest.input('parsaType', sql.NVarChar, parsaType);
    }
    
    // اضافه کردن پارامتر approvedAmount در صورت وجود
    if (approvedAmount !== undefined) {
      updateRequest.input('approvedAmount', sql.Int, approvedAmount);
    }
    
    await updateRequest.query(updateQuery);

    // حذف اساتید قبلی
    await transaction.request()
      .input('thesisId', sql.Int, thesisId)
      .query('DELETE FROM professors_students WHERE ThesisID = @thesisId');

    // اضافه کردن اساتید جدید
    for (const professor of professors) {
      await transaction.request()
        .input('thesisId', sql.Int, thesisId)
        .input('professorId', sql.NVarChar, professor.nationalCode)
        .input('student_id', sql.NVarChar, studentId)
        .input('participation', sql.Int, professor.participation)
        .query(`
          INSERT INTO professors_students (ThesisID, professornationalcode, student_id, percentforprefessor)
          VALUES (@thesisId, @professorId, @student_id, @participation)
        `);
    }

    await transaction.commit();
    
    // بازگشت اطلاعات به‌روز شده (اختیاری)
    const updatedThesis = await pool.request()
      .input('thesisId', sql.Int, thesisId)
      .query(`
        SELECT 
          t.ThesisID,
          t.Title,
          t.ThesisType,
          t.LevelID,
          t.ApprovedAmount,
          t.ParsaType,
          t.StudentID
        FROM theses t
        WHERE t.ThesisID = @thesisId
      `);
    
    res.status(200).json({
      message: "پایان‌نامه با موفقیت ویرایش شد",
      thesis: updatedThesis.recordset[0]
    });
  } catch (err) {
    await transaction.rollback();
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});
// حذف پایان‌نامه
// حذف پایان‌نامه


app.delete("/theses/:thesisId", authenticate, async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    const { thesisId } = req.params;
    
    // بررسی نقش کاربر
    if (!req.user.roles.includes('کارشناس پژوهشی دانشکده') && !req.user.roles.includes('مدیر سیستم')) {
      return res.status(403).send('شما مجوز حذف پایان‌نامه را ندارید');
    }

    await transaction.begin();
    const pool = await sql.connect(config);
    
    // دریافت شماره دانشجویی
    const studentResult = await transaction.request()
      .input('thesisId', sql.Int, thesisId)
      .query('SELECT StudentID FROM theses WHERE ThesisID = @thesisId');

    if (studentResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: 'پایان‌نامه یافت نشد' });
    }

    const studentId = studentResult.recordset[0].StudentID;
    
    // حذف پایان‌نامه از دیتابیس
    await transaction.request()
      .input('thesisId', sql.Int, thesisId)
      .query(`
        DELETE FROM professors_students WHERE ThesisID = @thesisId;
        DELETE FROM thesis_history WHERE ThesisID = @thesisId;
        DELETE FROM factors WHERE ThesisID = @thesisId;
        DELETE FROM theses WHERE ThesisID = @thesisId;
      `);

    // حذف پوشه مربوط به شماره دانشجویی
    const studentFolderPath = path.join(__dirname, 'uploads', 'factors', String(studentId));
    if (fs.existsSync(studentFolderPath)) {
      fs.rmSync(studentFolderPath, { recursive: true, force: true });
    }

    await transaction.commit();
    res.status(200).send('پایان‌نامه با موفقیت حذف شد');
  } catch (err) {
    await transaction.rollback();
    console.error("Error deleting thesis:", err);
    res.status(500).send(err.message);
  }
});
  
//////////////



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
          t.SystemRegistrationDate,
          t.ExpiryDate,
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
          t.Deputy_Confirmation,
          t.Deputy_Expert_Confirmation,
          t.Deputy_Expert_Confirmation_First,
          t.Deputy_Expert_Confirmation_Second
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
  const pool = await sql.connect(config);
  const transaction = new sql.Transaction(pool);

  try {
    const { thesisId } = req.params;

    if (!req.user.roles.includes('عضو هیات علمی')) {
      return res.status(403).send('شما مجوز ثبت هزینه را ندارید');
    }

    if (!req.file) {
      return res.status(400).send('فایل فاکتور الزامی است');
    }

    const {
      factorNumber,
      factorDate,
      amount,
      description,
      professorNationalCode,
      ForFirstFiftyPercent,
      ForSecondFiftyPercent
    } = req.body;

    if (!professorNationalCode) {
      return res.status(400).send('کد ملی استاد الزامی است');
    }

    if (!factorNumber || !factorDate || !amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).send('ورودی‌های الزامی (شماره فاکتور، تاریخ، مبلغ مثبت) را بررسی کنید');
    }

    const newAmount = parseFloat(amount);

    await transaction.begin();

    // 1. دریافت ApprovedAmount پایان‌نامه
    const thesisResult = await transaction.request()
      .input('thesisId', sql.Int, thesisId)
      .query(`SELECT ApprovedAmount FROM theses WHERE ThesisID = @thesisId`);

    if (thesisResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).send('پایان‌نامه یافت نشد');
    }

    const approvedAmount = thesisResult.recordset[0].ApprovedAmount;

    // 2. سهم استاد
    const professorShareResult = await transaction.request()
      .input('thesisId', sql.Int, thesisId)
      .input('professorNationalCode', sql.NVarChar, professorNationalCode)
      .query(`
        SELECT percentforprefessor
        FROM professors_students
        WHERE ThesisID = @thesisId AND professornationalcode = @professorNationalCode
      `);

    if (professorShareResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(403).send('شما استاد راهنما این پایان‌نامه نیستید');
    }

    const participation = professorShareResult.recordset[0].percentforprefessor;
    const professorShare = approvedAmount * (participation / 100);

    // 3. مجموع فاکتورهای قبلی این استاد (تفکیک 50%)
    const totalsResult = await transaction.request()
      .input('thesisId', sql.Int, thesisId)
      .input('professorNationalCode', sql.NVarChar, professorNationalCode)
      .query(`
        SELECT 
          SUM(CASE WHEN ForFirstFiftyPercent = 1 THEN Amount ELSE 0 END) AS totalFirst,
          SUM(CASE WHEN ForSecondFiftyPercent = 1 THEN Amount ELSE 0 END) AS totalSecond
        FROM factors
        WHERE ThesisID = @thesisId AND ProfessorNationalCode = @professorNationalCode
      `);

    const totalFirst = totalsResult.recordset[0].totalFirst || 0;
    const totalSecond = totalsResult.recordset[0].totalSecond || 0;

    // 4. اعتبارسنجی سهم
    if (ForFirstFiftyPercent == "true" || ForFirstFiftyPercent === true) {
      const maxHalf = professorShare / 2;
      if (totalFirst + newAmount > maxHalf) {
        await transaction.rollback();
        return res.status(400).send(`مجموع فاکتورهای 50٪ اول (${totalFirst + newAmount}) از حد مجاز (${maxHalf}) بیشتر است`);
      }
    }

    if (ForSecondFiftyPercent == "true" || ForSecondFiftyPercent === true) {
      const maxHalf = professorShare / 2;
      if (totalSecond + newAmount > maxHalf) {
        await transaction.rollback();
        return res.status(400).send(`مجموع فاکتورهای 50٪ دوم (${totalSecond + newAmount}) از حد مجاز (${maxHalf}) بیشتر است`);
      }
      if (totalFirst + totalSecond + newAmount > professorShare) {
        await transaction.rollback();
        return res.status(400).send(`مجموع کل فاکتورهای شما از سهم کل (${professorShare}) بیشتر است`);
      }
    }

    // 5. بررسی مجموع کل فاکتورهای پایان‌نامه
    const allFactorsResult = await transaction.request()
      .input('thesisId', sql.Int, thesisId)
      .query(`SELECT SUM(Amount) AS totalAllFactors FROM factors WHERE ThesisID = @thesisId`);

    const totalAllFactors = allFactorsResult.recordset[0].totalAllFactors || 0;
    const newTotal = totalAllFactors + newAmount;

    if (newTotal > approvedAmount) {
      await transaction.rollback();
      return res.status(400).send(`مجموع فاکتورها (${newTotal}) از مبلغ مصوب (${approvedAmount}) بیشتر است`);
    }

    // 6. مسیر فایل
    const relativePath = req.file.path.replace(/^.*uploads[\\/]/, '');
    const filePath = `/uploads/${relativePath.replace(/\\/g, '/')}`;

    // 7. درج فاکتور
    await transaction.request()
      .input('thesisId', sql.Int, thesisId)
      .input('factorNumber', sql.NVarChar, factorNumber)
      .input('factorDate', sql.NVarChar, factorDate)
      .input('amount', sql.Decimal, newAmount)
      .input('description', sql.NVarChar, description)
      .input('filePath', sql.NVarChar, filePath)
      .input('professorNationalCode', sql.NVarChar, professorNationalCode)
      .input('forFirst', sql.Bit, ForFirstFiftyPercent == "true" || ForFirstFiftyPercent === true ? 1 : null)
      .input('forSecond', sql.Bit, ForSecondFiftyPercent == "true" || ForSecondFiftyPercent === true ? 1 : null)
      .query(`
        INSERT INTO factors 
        (ThesisID, FactorNumber, FactorDate, Amount, Description, Filepath, ProfessorNationalCode, ForFirstFiftyPercent, ForSecondFiftyPercent)
        VALUES 
        (@thesisId, @factorNumber, @factorDate, @amount, @description, @filePath, @professorNationalCode, @forFirst, @forSecond)
      `);

    await addThesisHistory(
      thesisId, 
      'ثبت فاکتور', 
      `فاکتور به مبلغ ${newAmount} و تاریخ ${factorDate} توسط استاد ${professorNationalCode} ثبت شد`,
      req.user.id
    );

    await transaction.commit();
    res.status(201).send('فاکتور با موفقیت ثبت شد');
  } catch (err) {
    await transaction.rollback();
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
          f.FactorID,
          f.FactorNumber,
          f.FactorDate,
          f.Amount,
          f.Description,
          f.Filepath,
          f.IsConfirmedByExpert,
          f.IsConfirmedByDeputy,
          f.IsConfirmedByResearchDirector,
          f.IsConfirmedByUniversityDeputy,
          f.ProfessorNationalCode,
          u.firstName + ' ' + u.lastName AS ProfessorName,
          ps.percentforprefessor AS ProfessorParticipation,
          f.ForFirstFiftyPercent,
          f.ForSecondFiftyPercent
        FROM factors f
        LEFT JOIN professors_students ps 
          ON f.ThesisID = ps.ThesisID
         AND f.ProfessorNationalCode = ps.professornationalcode
        LEFT JOIN users u 
          ON f.ProfessorNationalCode = u.nationalCode
        WHERE f.ThesisID = @thesisId
        ORDER BY f.FactorDate DESC
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
    if (!req.user.roles.includes('کارشناس مالی دانشکده')) {
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
// app.put("/factors/:factorId/confirm-deputy", authenticate, async (req, res) => {
//   try {
//     const { factorId } = req.params;
//     const { status } = req.body;
  
//     // بررسی نقش کاربر
//     if (!req.user.roles.includes('معاون پژوهشی دانشکده')) {
//       return res.status(403).send('شما مجوز تایید فاکتور را ندارید');
//     }

//     const pool = await sql.connect(config);
    
//     // بررسی اینکه فاکتور قبلاً توسط کارشناس تایید شده باشد
//     const checkResult = await pool.request()
//       .input('factorId', sql.Int, factorId)
//       .query(`
//         SELECT IsConfirmedByExpert 
//         FROM factors 
//         WHERE FactorID = @factorId
//       `);

//     if (checkResult.recordset[0]?.IsConfirmedByExpert != 1) {
//       return res.status(400).send('فاکتور باید ابتدا توسط کارشناس تایید شود');
//     }

//     await pool.request()
//       .input('factorId', sql.Int, factorId)
//       .input('status', sql.Int, status)
//       .query(`
//         UPDATE factors
//         SET IsConfirmedByDeputy = @status
//         WHERE FactorID = @factorId
//       `);

//     res.status(200).send('فاکتور با موفقیت توسط معاون پژوهشی تایید شد');
//   } catch (err) {
//     console.error("SQL error:", err);
//     res.status(500).send(err.message);
//   }
// });

// تایید فاکتور توسط معاون پژوهشی دانشکده (با ذخیره userName که همان کد ملی است)
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

    // استفاده مستقیم از req.user.userName (که همان کد ملی است)
    const deputyUserName = status ? req.user.userName : null;

    await pool.request()
      .input('factorId', sql.Int, factorId)
      .input('status', sql.Int, status)
      .query(`
        UPDATE factors
        SET IsConfirmedByDeputy = @status
          
        WHERE FactorID = @factorId
      `);

    // ثبت در تاریخچه
    const action = status ? 'تایید' : 'رد';
    //await addThesisHistoryByFactor(factorId, `${action} توسط معاون پژوهشی دانشکده`, req.user.id);

    res.status(200).send(`فاکتور با موفقیت ${status ? 'تایید' : 'رد'} شد`);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

/////////////
// تایید فاکتور توسط مدیر امور پژوهشی
// app.put("/factors/:factorId/confirm-research-director", authenticate, async (req, res) => {
//   try {
//     const { factorId } = req.params;
//     const { status } = req.body;

//     // بررسی نقش کاربر
//     if (!req.user.roles.includes('مدیر امور پژوهشی')) {
//       return res.status(403).send('شما مجوز تایید فاکتور را ندارید');
//     }

//     const pool = await sql.connect(config);
    
//     // بررسی اینکه فاکتور قبلاً توسط کارشناس و معاون پژوهشی دانشکده تایید شده باشد
//     const checkResult = await pool.request()
//       .input('factorId', sql.Int, factorId)
//       .query(`
//         SELECT IsConfirmedByExpert ,IsConfirmedByDeputy
//         FROM factors 
//         WHERE FactorID = @factorId
//       `);

//     if (checkResult.recordset[0]?.IsConfirmedByExpert != 1) {
//       return res.status(400).send('فاکتور باید ابتدا توسط کارشناس تایید شود');
//     }
    
//     if (checkResult.recordset[0]?.IsConfirmedByDeputy != 1) {
//       return res.status(400).send('فاکتور باید ابتدا توسط معاون پزوهشی دانشکده تایید شود');
//     }




//     await pool.request()
//       .input('factorId', sql.Int, factorId)
//       .input('status', sql.Int, status)
//       .query(`
//         UPDATE factors
//         SET isConfirmedByResearchDirector = @status
//         WHERE FactorID = @factorId
//       `);

//     res.status(200).send('فاکتور با موفقیت توسط مدیر پژوهشی تایید شد');
//   } catch (err) {
//     console.error("SQL error:", err);
//     res.status(500).send(err.message);
//   }
// });

// تایید فاکتور توسط مدیر امور پژوهشی (با ذخیره userName که همان کد ملی است)
app.put("/factors/:factorId/confirm-research-director", authenticate, async (req, res) => {
  try {
    const { factorId } = req.params;
    const { status } = req.body;

    // بررسی نقش کاربر
    if (!req.user.roles.includes('مدیر امور پژوهشی')) {
      return res.status(403).send('شما مجوز تایید فاکتور را ندارید');
    }

    const pool = await sql.connect(config);
    
    // بررسی اینکه فاکتور قبلاً توسط کارشناس و معاون پژوهشی دانشکده تایید شده باشد
    const checkResult = await pool.request()
      .input('factorId', sql.Int, factorId)
      .query(`
        SELECT IsConfirmedByExpert, IsConfirmedByDeputy
        FROM factors 
        WHERE FactorID = @factorId
      `);

    if (checkResult.recordset[0]?.IsConfirmedByExpert != 1) {
      return res.status(400).send('فاکتور باید ابتدا توسط کارشناس تایید شود');
    }
    
    if (checkResult.recordset[0]?.IsConfirmedByDeputy != 1) {
      return res.status(400).send('فاکتور باید ابتدا توسط معاون پژوهشی دانشکده تایید شود');
    }

    // استفاده مستقیم از req.user.userName (که همان کد ملی است)
    const researchDirectorUserName = status ? req.user.userName : null;

    await pool.request()
      .input('factorId', sql.Int, factorId)
      .input('status', sql.Int, status)
        .query(`
        UPDATE factors
        SET IsConfirmedByResearchDirector = @status
          
        WHERE FactorID = @factorId
      `);

    // ثبت در تاریخچه
    const action = status ? 'تایید' : 'رد';
    //await addThesisHistoryByFactor(factorId, `${action} توسط مدیر امور پژوهشی`, req.user.id);

    res.status(200).send(`فاکتور با موفقیت ${status ? 'تایید' : 'رد'} شد`);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});
//////////////


/////////////

// تایید فاکتور توسط   معاون پژوهشی دانشگاه
// app.put("/factors/:factorId/confirm-university-director", authenticate, async (req, res) => {
//   try {
//     const { factorId } = req.params;
//     const { status } = req.body;
  
//     // بررسی نقش کاربر
//     if (!req.user.roles.includes('معاون پژوهشی دانشگاه')) {
//       return res.status(403).send('شما مجوز تایید فاکتور را ندارید');
//     }

//     const pool = await sql.connect(config);
    
//     // بررسی اینکه فاکتور قبلاً توسط کارشناس و معاون پژوهشی دانشکده تایید شده باشد
//     const checkResult = await pool.request()
//       .input('factorId', sql.Int, factorId)
//       .query(`
//         SELECT IsConfirmedByExpert ,IsConfirmedByDeputy,IsConfirmedByResearchDirector
//         FROM factors 
//         WHERE FactorID = @factorId
//       `);

//     if (checkResult.recordset[0]?.IsConfirmedByExpert != 1) {
//       return res.status(400).send('فاکتور باید ابتدا توسط کارشناس تایید شود');
//     }
    
//     if (checkResult.recordset[0]?.IsConfirmedByDeputy != 1) {
//       return res.status(400).send('فاکتور باید ابتدا توسط معاون پزوهشی دانشکده تایید شود');
//     }

     
//     if (checkResult.recordset[0]?.IsConfirmedByResearchDirector != 1) {
//       return res.status(400).send('فاکتور باید ابتدا توسط مدیر امور پژوهشی  تایید شود');
//     }




//     await pool.request()
//       .input('factorId', sql.Int, factorId)
//       .input('status', sql.Int, status)
//       .query(`
//         UPDATE factors
//         SET IsConfirmedByUniversityDeputy = @status
//         WHERE FactorID = @factorId
//       `);

//     res.status(200).send('فاکتور با موفقیت توسط  معاون پژوهشی دانشگاه تایید شد');
//   } catch (err) {
//     console.error("SQL error:", err);
//     res.status(500).send(err.message);
//   }
// });

app.put("/factors/:factorId/confirm-university-director", authenticate, async (req, res) => {
  try {
    const { factorId } = req.params;
    const { status } = req.body;
  
    // بررسی نقش کاربر
    if (!req.user.roles.includes('معاون پژوهشی دانشگاه')) {
      return res.status(403).send('شما مجوز تایید فاکتور را ندارید');
    }

    const pool = await sql.connect(config);
    
    // بررسی اینکه فاکتور قبلاً توسط کارشناس، معاون پژوهشی دانشکده و مدیر امور پژوهشی تایید شده باشد
    const checkResult = await pool.request()
      .input('factorId', sql.Int, factorId)
      .query(`
        SELECT IsConfirmedByExpert, IsConfirmedByDeputy, IsConfirmedByResearchDirector
        FROM factors 
        WHERE FactorID = @factorId
      `);

    if (checkResult.recordset[0]?.IsConfirmedByExpert != 1) {
      return res.status(400).send('فاکتور باید ابتدا توسط کارشناس تایید شود');
    }
    
    if (checkResult.recordset[0]?.IsConfirmedByDeputy != 1) {
      return res.status(400).send('فاکتور باید ابتدا توسط معاون پژوهشی دانشکده تایید شود');
    }

    if (checkResult.recordset[0]?.IsConfirmedByResearchDirector != 1) {
      return res.status(400).send('فاکتور باید ابتدا توسط مدیر امور پژوهشی تایید شود');
    }

    // استفاده مستقیم از req.user.userName (که همان کد ملی است)
    const universityDeputyUserName = status ? req.user.userName : null;

    await pool.request()
      .input('factorId', sql.Int, factorId)
      .input('status', sql.Int, status)
      .query(`
        UPDATE factors
        SET IsConfirmedByUniversityDeputy = @status
           
        WHERE FactorID = @factorId
      `);

    // ثبت در تاریخچه
    const action = status ? 'تایید' : 'رد';
   // await addThesisHistoryByFactor(factorId, `${action} توسط معاون پژوهشی دانشگاه`, req.user.id);

    res.status(200).send(`فاکتور با موفقیت ${status ? 'تایید' : 'رد'} شد`);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});
//////////
// حذف فاکتور
// app.delete("/factors/:factorId", authenticate, async (req, res) => {
//   try {
//     const { factorId } = req.params;
    
//     // بررسی نقش کاربر - فقط استاد راهنما یا مدیر سیستم می‌تواند حذف کند
//     if (!req.user.roles.includes('کارشناس پژوهشی دانشکده') && !req.user.roles.includes('مدیر سیستم')&& !req.user.roles.includes('معاون پژوهشی دانشکده')&& !req.user.roles.includes('عضو هیات علمی') ) {
//       return res.status(403).send('شما مجوز حذف فاکتور را ندارید');
//     }

//     const pool = await sql.connect(config);
    
//     // دریافت مسیر فایل قبل از حذف
//     const fileResult = await pool.request()
//       .input('factorId', sql.Int, factorId)
//       .query(`
//         SELECT Filepath 
//         FROM factors 
//         WHERE FactorID = @factorId
//       `);

//     const filePath = fileResult.recordset[0]?.Filepath;
    
//     // حذف فاکتور از دیتابیس
//     await pool.request()
//       .input('factorId', sql.Int, factorId)
//       .query(`
//         DELETE FROM factors
//         WHERE FactorID = @factorId
//       `);

//     // حذف فایل از سیستم فایل
//     if (filePath) {
//       const fullPath = path.join(__dirname, filePath);
//       if (fs.existsSync(fullPath)) {
//         fs.unlinkSync(fullPath);
//       }
//     }

//     res.status(200).send('فاکتور با موفقیت حذف شد');
//   } catch (err) {
//     console.error("Error deleting factor:", err);
//     res.status(500).send(err.message);
//   }
// });


// حذف فاکتور (به‌روزرسانی شده)
app.delete("/factors/:factorId", authenticate, async (req, res) => {
  try {
    const { factorId } = req.params;
    
    // بررسی نقش کاربر
    const allowedRoles = ['کارشناس پژوهشی دانشکده', 'مدیر سیستم', 'معاون پژوهشی دانشکده', 'عضو هیات علمی','کارشناس مالی دانشکده'];
    if (!req.user.roles.some(role => allowedRoles.includes(role))) {
      return res.status(403).json({ message: 'شما مجوز حذف فاکتور را ندارید' });
    }

    const pool = await sql.connect(config);
    
    // دریافت اطلاعات فاکتور قبل از حذف
    const factorResult = await pool.request()
      .input('factorId', sql.Int, factorId)
      .query(`
        SELECT f.Filepath, f.ThesisID, f.IsConfirmedByExpert
        FROM factors f 
        WHERE f.FactorID = @factorId
      `);
    
    if (factorResult.recordset.length === 0) {
      return res.status(404).json({ message: 'فاکتور یافت نشد' });
    }
    
    const factor = factorResult.recordset[0];
    
    // اگر کاربر عضو هیات علمی است، فقط می‌تواند فاکتورهایی را حذف کند که تایید نشده‌اند
    if (req.user.roles.includes('عضو هیات علمی') && factor.IsConfirmedByExpert == 1) {
      return res.status(403).json({ message: 'فاکتور تایید شده توسط کارشناس مالی قابل حذف نیست' });
    }
    
    const filePath = factor.Filepath;
    
    // حذف فاکتور از دیتابیس
    await pool.request()
      .input('factorId', sql.Int, factorId)
      .query(`DELETE FROM factors WHERE FactorID = @factorId`);
    
    // حذف فایل از سیستم فایل
    if (filePath) {
      const fullPath = path.join(__dirname, filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        
        // حذف پوشه خالی parent
        const parentDir = path.dirname(fullPath);
        if (fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
          fs.rmdirSync(parentDir);
        }
      }
    }
    
    // ثبت در تاریخچه
    await addThesisHistory(
      factor.ThesisID,
      'حذف فاکتور',
      `فاکتور توسط ${req.user.roles.includes('عضو هیات علمی') ? 'استاد راهنما' : 'کارشناس'} حذف شد`,
      req.user.id
    );
    
    res.status(200).json({ message: 'فاکتور با موفقیت حذف شد' });
  } catch (err) {
    console.error("Error deleting factor:", err);
    res.status(500).json({ message: err.message });
  }
});



// دریافت همه فاکتورها با اطلاعات پایان‌نامه و اساتید راهنما
app.get("/factors/all", authenticate, async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const selectedRole = req.user.selectedRole;

    // چک نقش: فقط نقش‌های مجاز
    const allowedRoles = ["مدیر سیستم", "معاون پژوهشی دانشگاه", "کارشناس پژوهشی معاونت پژوهشی", "معاون پژوهشی دانشکده", "کارشناس پژوهشی دانشکده", "عضو هیات علمی","کارشناس مالی دانشکده"];
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
        f.IsConfirmedByResearchDirector,
        f.IsConfirmedByUniversityDeputy,
        f.ProfessorNationalCode,  -- اضافه شده
    CONCAT(u2.firstName, ' ', u2.lastName) AS ProfessorName,  -- اضافه شده: نام استاد
        s.FacultyID,
        s.DepartmentID
      FROM factors f
      JOIN theses t ON f.ThesisID = t.ThesisID
      JOIN students s ON t.StudentID = s.StudentID
      LEFT JOIN faculties fac ON s.FacultyID = fac.FacultyID
      LEFT JOIN departments d ON s.DepartmentID = d.DepartmentID
      LEFT JOIN users u2 ON f.ProfessorNationalCode = u2.nationalCode  -- جوین جدید برای دریافت نام استاد
    `;

    // اگر نقش انتخابی 'عضو هیات علمی' است، فقط فاکتورهای مربوط به پایان‌نامه‌های استاد را نمایش بده
    if (selectedRole == 'عضو هیات علمی') {
      query += `
        JOIN professors_students ps ON t.ThesisID = ps.ThesisID
        WHERE ps.professornationalcode = '${req.user.nationalCode}'
      `;
    }

    // فیلترهای دانشکده و گروه برای نقش‌های خاص
    if (['کارشناس پژوهشی دانشکده', 'معاون پژوهشی دانشکده', 'مدیر گروه','کارشناس مالی دانشکده'].includes(selectedRole)) {
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
    
    // دریافت اطلاعات اساتید راهنما برای هر ThesisID
    const factorsWithProfessors = await Promise.all(
      result.recordset.map(async (factor) => {
        const professorsResult = await pool.request()
          .input('thesisId', sql.Int, factor.ThesisID)
          .query(`
            SELECT 
              u.firstName + ' ' + u.lastName AS ProfessorName,
              u.nationalCode,
              ps.percentforprefessor
            FROM professors_students ps
            JOIN users u ON ps.professornationalcode = u.nationalCode
            WHERE ps.ThesisID = @thesisId
          `);
        
        return {
          ...factor,
          professors: professorsResult.recordset
        };
      })
    );
    
    res.json(factorsWithProfessors);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

////////////



app.get("/students", authenticate, async (req, res) => {
  try {
    await poolConnect;
   
    const { page = 1, limit = 5, search = "", facultyId } = req.query;
    
    const offset = (page - 1) * limit;

    // Base query
    let query = `
      SELECT 
        s.StudentID, 
        s.FirstName, 
        s.LastName, 
        s.NationalID, 
        s.FacultyID,
        s.DepartmentID,
        s.LevelID,
        s.gender,
        s.major,
        s.phone,
        f.FacultyName,
        d.DepartmentName,
        el.LevelName
      FROM students s
      LEFT JOIN faculties f ON s.FacultyID = f.FacultyID
      LEFT JOIN departments d ON s.DepartmentID = d.DepartmentID
      LEFT JOIN educationlevels el ON s.LevelID = el.LevelID
    `;

    // Add filters
    let whereClauses = [];
    let queryParams = [];

    if (search) {
      whereClauses.push(`(s.FirstName LIKE @search 
                         OR s.LastName LIKE @search 
                         OR s.NationalID LIKE @search 
                         OR s.StudentID LIKE @search)`);
      queryParams.push({ name: 'search', type: sql.NVarChar, value: `%${search}%` });
    }

    if (facultyId) {
      // فقط اگر کاربر مجاز باشد (کارشناس پژوهشی دانشکده یا مدیر سیستم)
      const allowedRoles = ['کارشناس پژوهشی دانشکده', 'مدیر سیستم'];
      if (!req.user.roles.some(role => allowedRoles.includes(role))) {
        return res.status(403).json({ message: 'دسترسی غیرمجاز به فیلتر دانشکده' });
      }
      
      // اگر کارشناس باشد، مطمئن شو که facultyId با FacultyID کاربر مطابقت دارد
      if (req.user.roles.includes('کارشناس پژوهشی دانشکده')) {
        if (parseInt(facultyId) !== req.user.facultyID) {  // FacultyID از توکن می‌آید
          return res.status(403).json({ message: 'شما فقط به دانشجویان دانشکده خود دسترسی دارید' });
        }
      }
      
      whereClauses.push(`s.FacultyID = @facultyId`);
      queryParams.push({ name: 'facultyId', type: sql.Int, value: parseInt(facultyId) });
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Get total count - اصلاح شده
    let countQuery = `SELECT COUNT(*) as total FROM students s`; // اضافه کردن alias 's'
    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    const countRequest = pool.request();
    queryParams.forEach(param => {
      countRequest.input(param.name, param.type, param.value);
    });
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;

    // Add pagination
    query += `
      ORDER BY s.StudentID
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    // Execute main query
    const request = pool.request();
    queryParams.forEach(param => {
      request.input(param.name, param.type, param.value);
    });
    const result = await request.query(query);

    res.json({
      students: result.recordset,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

// ایجاد دانشجوی جدید
app.post("/students", authenticate,  async (req, res) => {
  await poolConnect;
  const transaction = new sql.Transaction(pool);
  
  try {
    const { StudentID, FirstName, LastName, NationalID, FacultyID, DepartmentID, LevelID, gender, major, phone } = req.body;
    
    if (!StudentID || !FirstName || !LastName || !FacultyID || !DepartmentID || !LevelID) {
      return res.status(400).send("تمام فیلدهای الزامی (شماره دانشجویی، نام، نام خانوادگی، دانشکده، گروه، مقطع) باید پر شوند");
    }

    await transaction.begin();
    
    const request = transaction.request()
      .input('StudentID', sql.NChar(10), StudentID)
      .input('FirstName', sql.NVarChar(50), FirstName)
      .input('LastName', sql.NVarChar(50), LastName)
      .input('NationalID', sql.NVarChar(10), NationalID || null)
      .input('FacultyID', sql.Int, FacultyID)
      .input('DepartmentID', sql.Int, DepartmentID)
      .input('LevelID', sql.Int, LevelID)
      .input('gender', sql.Bit, gender !== null ? gender : null)
      .input('major', sql.NVarChar(100), major || null)
      .input('phone', sql.NChar(11), phone || null);

    await request.query(`
      INSERT INTO students (StudentID, FirstName, LastName, NationalID, FacultyID, DepartmentID, LevelID, gender, major, phone)
      VALUES (@StudentID, @FirstName, @LastName, @NationalID, @FacultyID, @DepartmentID, @LevelID, @gender, @major, @phone)
    `);
    
    await transaction.commit();
    res.status(201).send("دانشجو با موفقیت اضافه شد");
  } catch (err) {
    await transaction.rollback();
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

// ویرایش دانشجو
app.put("/students/:StudentID", authenticate,  async (req, res) => {
  await poolConnect;
  const transaction = new sql.Transaction(pool);
  
  try {
    const { StudentID } = req.params;
    const { FirstName, LastName, NationalID, FacultyID, DepartmentID, LevelID, gender, major, phone } = req.body;
    
    if (!FirstName || !LastName || !FacultyID || !DepartmentID || !LevelID) {
      return res.status(400).send("تمام فیلدهای الزامی (نام، نام خانوادگی، دانشکده، گروه، مقطع) باید پر شوند");
    }

    await transaction.begin();
    
    const request = transaction.request()
      .input('StudentID', sql.NChar(10), StudentID)
      .input('FirstName', sql.NVarChar(50), FirstName)
      .input('LastName', sql.NVarChar(50), LastName)
      .input('NationalID', sql.NVarChar(10), NationalID || null)
      .input('FacultyID', sql.Int, FacultyID)
      .input('DepartmentID', sql.Int, DepartmentID)
      .input('LevelID', sql.Int, LevelID)
      .input('gender', sql.Bit, gender !== null ? gender : null)
      .input('major', sql.NVarChar(100), major || null)
      .input('phone', sql.NChar(11), phone || null);

    const result = await request.query(`
      UPDATE students 
      SET 
        FirstName = @FirstName, 
        LastName = @LastName, 
        NationalID = @NationalID, 
        FacultyID = @FacultyID, 
        DepartmentID = @DepartmentID, 
        LevelID = @LevelID, 
        gender = @gender, 
        major = @major, 
        phone = @phone
      WHERE StudentID = @StudentID
    `);

    if (result.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(404).send("دانشجو یافت نشد");
    }
    
    await transaction.commit();
    res.status(200).send("دانشجو با موفقیت ویرایش شد");
  } catch (err) {
    await transaction.rollback();
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

// حذف دانشجو
app.delete("/students/:StudentID", authenticate,  async (req, res) => {
  await poolConnect;
  const transaction = new sql.Transaction(pool);
  
  try {
    const { StudentID } = req.params;
    
    await transaction.begin();
    
    const result = await transaction.request()
      .input('StudentID', sql.NChar(10), StudentID)
      .query(`
        DELETE FROM students 
        WHERE StudentID = @StudentID
      `);
    
    if (result.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(404).send("دانشجو یافت نشد");
    }
    
    await transaction.commit();
    res.status(200).send("دانشجو با موفقیت حذف شد");
  } catch (err) {
    await transaction.rollback();
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});

//دریافت لیست مقاطع تحصیلی
app.get("/educationlevels1", authenticate,  async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT LevelID, LevelName 
      FROM educationlevels
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});


///////////


// گزارش پارسا برای کارشناس پژوهشی معاونت پژوهشی
app.get("/parsa-report", authenticate, async (req, res) => {
  try {
    // بررسی نقش کاربر
    if (!req.user.roles.includes('کارشناس پژوهشی معاونت پژوهشی')) {
      return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }

    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'بازه تاریخ الزامی است' });
    }

    const pool = await sql.connect(config);
    
    const result = await pool.request()
      .input('startDate', sql.NVarChar(10), startDate)
      .input('endDate', sql.NVarChar(10), endDate)
      .query(`
        SELECT 
        t.ThesisID,
          u.firstName + ' ' + u.lastName AS professorName,
          u.nationalCode,
          s.FirstName + ' ' + s.LastName AS studentName,
          l.LevelName as levelName,
          f.FacultyName as facultyName,
          t.Title AS title,
          t.parsaType,
          t.ThesisType,
          t.ApprovalDate as approvalDate,
          t.SystemRegistrationDate AS systemRegistrationDate,
          t.ExpiryDate as expiryDate,
          t.ApprovedAmount AS approvedAmount,
          ps.percentforprefessor AS percentage,
          CAST((t.ApprovedAmount * ps.percentforprefessor / 100.0) AS DECIMAL(18, 0)) AS professorAmount
        FROM professors_students ps
        JOIN theses t ON ps.ThesisID = t.ThesisID
        JOIN users u ON ps.professornationalcode = u.nationalCode
        JOIN students s ON t.StudentID = s.StudentID
        JOIN educationlevels l ON l.LevelID = s.LevelID
         JOIN faculties f ON f.FacultyID = s.FacultyID
        WHERE t.SystemRegistrationDate BETWEEN @startDate AND @endDate
       
          AND t.Deputy_Confirmation = 1
        ORDER BY t.SystemRegistrationDate DESC, u.lastName, u.firstName
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).json({ message: err.message });
  }
});





// در server.js، نسخه اصلاح شده endpoint update-expiry
app.put("/parsa-report/update-expiry", authenticate, async (req, res) => {
  try {
    // بررسی نقش کاربر
    if (!req.user.roles.includes('کارشناس پژوهشی معاونت پژوهشی')) {
      return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }

    const { thesisIds, expiryDate } = req.body;
    
    console.log('Received thesisIds:', thesisIds);
    console.log('Received expiryDate:', expiryDate);
    
    // اعتبارسنجی دقیق‌تر
    if (!thesisIds || !Array.isArray(thesisIds) || thesisIds.length === 0) {
      return res.status(400).json({ message: 'لیست پایان‌نامه‌ها الزامی است' });
    }
    
    // حذف مقادیر null یا undefined از آرایه
    const validThesisIds = thesisIds.filter(id => id != null && !isNaN(parseInt(id)));
    
    if (validThesisIds.length === 0) {
      return res.status(400).json({ message: 'هیچ شناسه معتبری برای پایان‌نامه‌ها وجود ندارد' });
    }
    
    if (!expiryDate) {
      return res.status(400).json({ message: 'تاریخ انقضا الزامی است' });
    }

    const pool = await sql.connect(config);
    
    // روش ساده و امن: استفاده از حلقه
    let updatedCount = 0;
    const failedIds = [];
    
    for (const thesisId of validThesisIds) {
      try {
        const result = await pool.request()
          .input('thesisId', sql.Int, parseInt(thesisId))
          .input('expiryDate', sql.NVarChar(10), expiryDate)
          .query(`
            UPDATE theses 
            SET ExpiryDate = @expiryDate
            WHERE ThesisID = @thesisId
          `);
        
        if (result.rowsAffected[0] > 0) {
          updatedCount++;
          
          // ثبت در تاریخچه
          await addThesisHistory(
            parseInt(thesisId),
            'تنظیم تاریخ انقضا',
            `تاریخ انقضا به تاریخ ${expiryDate} توسط کارشناس پژوهشی معاونت تنظیم شد`,
            req.user.id
          );
        } else {
          failedIds.push(thesisId);
        }
      } catch (err) {
        console.error(`Error updating thesis ${thesisId}:`, err);
        failedIds.push(thesisId);
      }
    }
    
    const message = updatedCount > 0 
      ? `تاریخ انقضا برای ${updatedCount} پایان‌نامه با موفقیت ثبت شد${failedIds.length > 0 ? ` (${failedIds.length} مورد ناموفق)` : ''}`
      : 'هیچ پایان‌نامه‌ای به‌روزرسانی نشد';
    
    res.json({ 
      message: message,
      updatedCount: updatedCount,
      failedCount: failedIds.length,
      failedIds: failedIds
    });
    
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).json({ message: err.message });
  }
});
// دریافت پایان‌نامه‌های دارای تاریخ انقضا برای گزارش
app.get("/parsa-report/expired-theses", authenticate, async (req, res) => {
  try {
    if (!req.user.roles.includes('کارشناس پژوهشی معاونت پژوهشی')) {
      return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }

    const { startDate, endDate } = req.query;
    const pool = await sql.connect(config);
    
    let query = `
      SELECT 
        t.ThesisID,
        u.firstName + ' ' + u.lastName AS professorName,
        u.nationalCode,
        s.FirstName + ' ' + s.LastName AS studentName,
        l.LevelName as levelName,
        f.FacultyName as facultyName,
        t.Title AS title,
        t.parsaType,
        t.ThesisType,
        t.ApprovalDate,
        t.SystemRegistrationDate,
        t.ExpiryDate,
        t.ApprovedAmount,
        ps.percentforprefessor AS percentage,
        CAST((t.ApprovedAmount * ps.percentforprefessor / 100.0) AS DECIMAL(18, 0)) AS professorAmount
      FROM professors_students ps
      JOIN theses t ON ps.ThesisID = t.ThesisID
      JOIN users u ON ps.professornationalcode = u.nationalCode
      JOIN students s ON t.StudentID = s.StudentID
      JOIN educationlevels l ON l.LevelID = s.LevelID
      JOIN faculties f ON f.FacultyID = s.FacultyID
      WHERE t.ExpiryDate IS NOT NULL
    `;
    
    if (startDate && endDate) {
      query += ` AND t.ExpiryDate BETWEEN @startDate AND @endDate`;
    }
    
    query += ` ORDER BY t.ExpiryDate DESC`;
    
    const request = pool.request();
    if (startDate && endDate) {
      request.input('startDate', sql.NVarChar(10), startDate);
      request.input('endDate', sql.NVarChar(10), endDate);
    }
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).json({ message: err.message });
  }
});
///////////////




// دریافت اطلاعات کاربران با نقش‌های خاص (برای گزارش)
app.get("/report-users", authenticate, async (req, res) => {
  try {
    const { roles, facultyId } = req.query;
    
    if (!roles) {
      return res.status(400).json({ message: 'نقش‌ها مشخص نشده است' });
    }
    
    const roleList = roles.split(',');
    
    const pool = await sql.connect(config);
    
    const usersByRole = {};
    
    for (const roleName of roleList) {
      let query = `
        SELECT DISTINCT
          u.id,
          u.firstName,
          u.lastName,
          u.SignaturePath,
          r.name as roleName,
          ur.facultyid
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        WHERE r.name = @roleName
      `;
      
      const request = pool.request();
      request.input('roleName', sql.NVarChar, roleName.trim());
      
      // برای نقش معاون پژوهشی دانشکده، فیلتر بر اساس facultyId اعمال می‌شود
      if (roleName.trim() === 'معاون پژوهشی دانشکده' && facultyId) {
        query += ` AND ur.facultyid = @facultyId`;
        request.input('facultyId', sql.Int, parseInt(facultyId));
      }
      
      const result = await request.query(query);
      
      usersByRole[roleName] = result.recordset.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        signaturePath: user.SignaturePath,
        facultyId: user.facultyid
      }));
    }
    
    res.json(usersByRole);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send(err.message);
  }
});
/////////

// ویرایش فاکتور توسط کارشناس مالی دانشکده
// app.put("/factors/:factorId", authenticate, upload.single('file'), async (req, res) => {
//   const pool = await sql.connect(config);
//   const transaction = new sql.Transaction(pool);
  
//   try {
//     const { factorId } = req.params;
//     const { factorNumber, factorDate, amount, description } = req.body;
    
//     // بررسی نقش کاربر (فقط کارشناس مالی دانشکده)
//     if (!req.user.roles.includes('کارشناس مالی دانشکده')) {
//       return res.status(403).json({ message: 'شما مجوز ویرایش فاکتور را ندارید' });
//     }
    
//     // اعتبارسنجی فیلدها
//     if (!factorNumber || !factorDate || !amount || parseFloat(amount) <= 0) {
//       return res.status(400).json({ message: 'شماره فاکتور، تاریخ و مبلغ مثبت الزامی هستند' });
//     }
    
//     if (!description || !description.trim()) {
//       return res.status(400).json({ message: 'شرح کالا الزامی است' });
//     }
    
//     await transaction.begin();
    
//     // بررسی وضعیت فعلی فاکتور - فقط اگر معاون دانشکده تایید نکرده باشد قابل ویرایش است
//     const checkResult = await transaction.request()
//       .input('factorId', sql.Int, factorId)
//       .query(`
//         SELECT f.IsConfirmedByDeputy, f.IsConfirmedByExpert, f.ThesisID, f.Amount as oldAmount, f.ProfessorNationalCode
//         FROM factors f
//         WHERE f.FactorID = @factorId
//       `);
    
//     if (checkResult.recordset.length === 0) {
//       await transaction.rollback();
//       return res.status(404).json({ message: 'فاکتور یافت نشد' });
//     }
    
//     const factor = checkResult.recordset[0];
    
//     // بررسی شرط ویرایش: فقط اگر معاون دانشکده تایید نکرده باشد
//     if (factor.IsConfirmedByDeputy == 1) {
//       await transaction.rollback();
//       return res.status(403).json({ message: 'فاکتور پس از تایید معاون پژوهشی دانشکده قابل ویرایش نیست' });
//     }
    
//     // بررسی محدودیت مبلغ کل پایان‌نامه
//     const thesisResult = await transaction.request()
//       .input('thesisId', sql.Int, factor.ThesisID)
//       .query(`SELECT ApprovedAmount FROM theses WHERE ThesisID = @thesisId`);
    
//     if (thesisResult.recordset.length === 0) {
//       await transaction.rollback();
//       return res.status(404).json({ message: 'پایان‌نامه یافت نشد' });
//     }
    
//     const approvedAmount = thesisResult.recordset[0].ApprovedAmount;
//     const newAmount = parseFloat(amount);
//     const oldAmount = parseFloat(factor.oldAmount);
//     const amountDifference = newAmount - oldAmount;
    
//     // اگر مبلغ افزایش یافته، بررسی کنید که از سقف مصوب تجاوز نکند
//     if (amountDifference > 0) {
//       // دریافت مجموع فاکتورهای دیگر (غیر از این فاکتور)
//       const otherFactorsResult = await transaction.request()
//         .input('thesisId', sql.Int, factor.ThesisID)
//         .input('factorId', sql.Int, factorId)
//         .query(`
//           SELECT SUM(Amount) as totalOtherFactors 
//           FROM factors 
//           WHERE ThesisID = @thesisId AND FactorID != @factorId
//         `);
      
//       const totalOtherFactors = otherFactorsResult.recordset[0].totalOtherFactors || 0;
//       const newTotal = totalOtherFactors + newAmount;
      
//       if (newTotal > approvedAmount) {
//         await transaction.rollback();
//         return res.status(400).json({ 
//           message: `مجموع فاکتورها (${newTotal.toLocaleString()}) از مبلغ مصوب (${approvedAmount.toLocaleString()}) بیشتر است` 
//         });
//       }
      
//       // بررسی محدودیت سهم استاد
//       const professorShareResult = await transaction.request()
//         .input('thesisId', sql.Int, factor.ThesisID)
//         .input('professorNationalCode', sql.NVarChar, factor.ProfessorNationalCode)
//         .query(`
//           SELECT percentforprefessor
//           FROM professors_students
//           WHERE ThesisID = @thesisId AND professornationalcode = @professorNationalCode
//         `);
      
//       if (professorShareResult.recordset.length > 0) {
//         const participation = professorShareResult.recordset[0].percentforprefessor;
//         const professorShare = approvedAmount * (participation / 100);
        
//         // دریافت مجموع فاکتورهای این استاد (غیر از این فاکتور)
//         const professorFactorsResult = await transaction.request()
//           .input('thesisId', sql.Int, factor.ThesisID)
//           .input('professorNationalCode', sql.NVarChar, factor.ProfessorNationalCode)
//           .input('factorId', sql.Int, factorId)
//           .query(`
//             SELECT SUM(Amount) as totalProfessorFactors 
//             FROM factors 
//             WHERE ThesisID = @thesisId 
//               AND ProfessorNationalCode = @professorNationalCode 
//               AND FactorID != @factorId
//           `);
        
//         const totalProfessorFactors = professorFactorsResult.recordset[0].totalProfessorFactors || 0;
//         const newProfessorTotal = totalProfessorFactors + newAmount;
        
//         if (newProfessorTotal > professorShare) {
//           await transaction.rollback();
//           return res.status(400).json({ 
//             message: `مجموع فاکتورهای شما (${newProfessorTotal.toLocaleString()}) از سهم شما (${professorShare.toLocaleString()}) بیشتر است` 
//           });
//         }
//       }
//     }
    
//     // آماده‌سازی کوئری آپدیت
//     let updateQuery = `
//       UPDATE factors 
//       SET 
//         FactorNumber = @factorNumber,
//         FactorDate = @factorDate,
//         Amount = @amount,
//         Description = @description
//     `;
    
//     // اگر فایل جدید آپلود شده، مسیر آن را به‌روزرسانی کن
//     let filePath = null;
//     if (req.file) {
//       const relativePath = req.file.path.replace(/^.*uploads[\\/]/, '');
//       filePath = `/uploads/${relativePath.replace(/\\/g, '/')}`;
//       updateQuery += `, Filepath = @filePath`;
      
//       // حذف فایل قدیمی
//       const oldFileResult = await transaction.request()
//         .input('factorId', sql.Int, factorId)
//         .query(`SELECT Filepath FROM factors WHERE FactorID = @factorId`);
      
//       const oldFilePath = oldFileResult.recordset[0]?.Filepath;
//       if (oldFilePath) {
//         const fullOldPath = path.join(__dirname, oldFilePath);
//         if (fs.existsSync(fullOldPath)) {
//           fs.unlinkSync(fullOldPath);
//         }
//       }
//     }
    
//     // اگر فاکتور قبلاً توسط کارشناس تایید شده بود، پس از ویرایش باید تایید کارشناس重置 شود
//     if (factor.IsConfirmedByExpert == 1) {
//       updateQuery += `, IsConfirmedByExpert = NULL`;
//     }
    
//     updateQuery += ` WHERE FactorID = @factorId`;
    
//     const updateRequest = transaction.request()
//       .input('factorId', sql.Int, factorId)
//       .input('factorNumber', sql.NVarChar, factorNumber)
//       .input('factorDate', sql.NVarChar, factorDate)
//       .input('amount', sql.Decimal, newAmount)
//       .input('description', sql.NVarChar, description);
    
//     if (filePath) {
//       updateRequest.input('filePath', sql.NVarChar, filePath);
//     }
    
//     await updateRequest.query(updateQuery);
    
//     // ثبت در تاریخچه پایان‌نامه
//     await addThesisHistory(
//       factor.ThesisID,
//       'ویرایش فاکتور',
//       `فاکتور شماره ${factorNumber} توسط کارشناس مالی دانشکده ویرایش شد. مبلغ قبلی: ${oldAmount.toLocaleString()} - مبلغ جدید: ${newAmount.toLocaleString()}`,
//       req.user.id
//     );
    
//     await transaction.commit();
    
//     //返回 اطلاعات به‌روز شده
//     const updatedFactor = await pool.request()
//       .input('factorId', sql.Int, factorId)
//       .query(`
//         SELECT 
//           f.FactorID,
//           f.FactorNumber,
//           f.FactorDate,
//           f.Amount,
//           f.Description,
//           f.Filepath,
//           f.IsConfirmedByExpert,
//           f.IsConfirmedByDeputy,
//           f.IsConfirmedByResearchDirector,
//           f.IsConfirmedByUniversityDeputy,
//           f.ProfessorNationalCode
//         FROM factors f
//         WHERE f.FactorID = @factorId
//       `);
    
//     res.status(200).json(updatedFactor.recordset[0]);
    
//   } catch (err) {
//     await transaction.rollback();
//     console.error("Error updating factor:", err);
//     res.status(500).json({ message: err.message });
//   }
// });
// ویرایش فاکتور توسط کارشناس مالی دانشکده
app.put("/factors/:factorId", authenticate, editFactorUpload.single('file'), async (req, res) => {
  const pool = await sql.connect(config);
  const transaction = new sql.Transaction(pool);
  
  try {
    const { factorId } = req.params;
    const { factorNumber, factorDate, amount, description } = req.body;
    
    // بررسی نقش کاربر (فقط کارشناس مالی دانشکده)
    if (!req.user.roles.includes('کارشناس مالی دانشکده')) {
      return res.status(403).json({ message: 'شما مجوز ویرایش فاکتور را ندارید' });
    }
    
    // اعتبارسنجی فیلدها
    if (!factorNumber || !factorDate || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'شماره فاکتور، تاریخ و مبلغ مثبت الزامی هستند' });
    }
    
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'شرح کالا الزامی است' });
    }
    
    await transaction.begin();
    
    // بررسی وضعیت فعلی فاکتور - فقط اگر معاون دانشکده تایید نکرده باشد قابل ویرایش است
    const checkResult = await transaction.request()
      .input('factorId', sql.Int, factorId)
      .query(`
        SELECT f.IsConfirmedByDeputy, f.IsConfirmedByExpert, f.ThesisID, f.Amount as oldAmount, f.ProfessorNationalCode, f.Filepath as oldFilePath
        FROM factors f
        WHERE f.FactorID = @factorId
      `);
    
    if (checkResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: 'فاکتور یافت نشد' });
    }
    
    const factor = checkResult.recordset[0];
    
    // بررسی شرط ویرایش: فقط اگر معاون دانشکده تایید نکرده باشد
    if (factor.IsConfirmedByDeputy == 1) {
      await transaction.rollback();
      return res.status(403).json({ message: 'فاکتور پس از تایید معاون پژوهشی دانشکده قابل ویرایش نیست' });
    }
    
    // بررسی محدودیت مبلغ کل پایان‌نامه
    const thesisResult = await transaction.request()
      .input('thesisId', sql.Int, factor.ThesisID)
      .query(`SELECT ApprovedAmount FROM theses WHERE ThesisID = @thesisId`);
    
    if (thesisResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: 'پایان‌نامه یافت نشد' });
    }
    
    const approvedAmount = thesisResult.recordset[0].ApprovedAmount;
    const newAmount = parseFloat(amount);
    const oldAmount = parseFloat(factor.oldAmount);
    const amountDifference = newAmount - oldAmount;
    
    // اگر مبلغ افزایش یافته، بررسی کنید که از سقف مصوب تجاوز نکند
    if (amountDifference > 0) {
      // دریافت مجموع فاکتورهای دیگر (غیر از این فاکتور)
      const otherFactorsResult = await transaction.request()
        .input('thesisId', sql.Int, factor.ThesisID)
        .input('factorId', sql.Int, factorId)
        .query(`
          SELECT SUM(Amount) as totalOtherFactors 
          FROM factors 
          WHERE ThesisID = @thesisId AND FactorID != @factorId
        `);
      
      const totalOtherFactors = otherFactorsResult.recordset[0].totalOtherFactors || 0;
      const newTotal = totalOtherFactors + newAmount;
      
      if (newTotal > approvedAmount) {
        await transaction.rollback();
        return res.status(400).json({ 
          message: `مجموع فاکتورها (${newTotal.toLocaleString()}) از مبلغ مصوب (${approvedAmount.toLocaleString()}) بیشتر است` 
        });
      }
      
      // بررسی محدودیت سهم استاد
      const professorShareResult = await transaction.request()
        .input('thesisId', sql.Int, factor.ThesisID)
        .input('professorNationalCode', sql.NVarChar, factor.ProfessorNationalCode)
        .query(`
          SELECT percentforprefessor
          FROM professors_students
          WHERE ThesisID = @thesisId AND professornationalcode = @professorNationalCode
        `);
      
      if (professorShareResult.recordset.length > 0) {
        const participation = professorShareResult.recordset[0].percentforprefessor;
        const professorShare = approvedAmount * (participation / 100);
        
        // دریافت مجموع فاکتورهای این استاد (غیر از این فاکتور)
        const professorFactorsResult = await transaction.request()
          .input('thesisId', sql.Int, factor.ThesisID)
          .input('professorNationalCode', sql.NVarChar, factor.ProfessorNationalCode)
          .input('factorId', sql.Int, factorId)
          .query(`
            SELECT SUM(Amount) as totalProfessorFactors 
            FROM factors 
            WHERE ThesisID = @thesisId 
              AND ProfessorNationalCode = @professorNationalCode 
              AND FactorID != @factorId
          `);
        
        const totalProfessorFactors = professorFactorsResult.recordset[0].totalProfessorFactors || 0;
        const newProfessorTotal = totalProfessorFactors + newAmount;
        
        if (newProfessorTotal > professorShare) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: `مجموع فاکتورهای شما (${newProfessorTotal.toLocaleString()}) از سهم شما (${professorShare.toLocaleString()}) بیشتر است` 
          });
        }
      }
    }
    
    // آماده‌سازی کوئری آپدیت
    let updateQuery = `
      UPDATE factors 
      SET 
        FactorNumber = @factorNumber,
        FactorDate = @factorDate,
        Amount = @amount,
        Description = @description
    `;
    
    // اگر فایل جدید آپلود شده، مسیر آن را به‌روزرسانی کن
    let filePath = null;
    if (req.file) {
      const relativePath = req.file.path.replace(/^.*uploads[\\/]/, '');
      filePath = `/uploads/${relativePath.replace(/\\/g, '/')}`;
      updateQuery += `, Filepath = @filePath`;
      
      // حذف فایل قدیمی
      if (factor.oldFilePath) {
        const fullOldPath = path.join(__dirname, factor.oldFilePath);
        if (fs.existsSync(fullOldPath)) {
          fs.unlinkSync(fullOldPath);
        }
      }
    }
    
    // اگر فاکتور قبلاً توسط کارشناس تایید شده بود، پس از ویرایش باید تایید کارشناس重置 شود
    if (factor.IsConfirmedByExpert == 1) {
      updateQuery += `, IsConfirmedByExpert = NULL`;
    }
    
    updateQuery += ` WHERE FactorID = @factorId`;
    
    const updateRequest = transaction.request()
      .input('factorId', sql.Int, factorId)
      .input('factorNumber', sql.NVarChar, factorNumber)
      .input('factorDate', sql.NVarChar, factorDate)
      .input('amount', sql.Decimal, newAmount)
      .input('description', sql.NVarChar, description);
    
    if (filePath) {
      updateRequest.input('filePath', sql.NVarChar, filePath);
    }
    
    await updateRequest.query(updateQuery);
    
    // ثبت در تاریخچه پایان‌نامه
    await addThesisHistory(
      factor.ThesisID,
      'ویرایش فاکتور',
      `فاکتور شماره ${factorNumber} توسط کارشناس مالی دانشکده ویرایش شد. مبلغ قبلی: ${oldAmount.toLocaleString()} - مبلغ جدید: ${newAmount.toLocaleString()}`,
      req.user.id
    );
    
    await transaction.commit();
    
    // برگرداندن اطلاعات به‌روز شده
    const updatedFactor = await pool.request()
      .input('factorId', sql.Int, factorId)
      .query(`
        SELECT 
          f.FactorID,
          f.FactorNumber,
          f.FactorDate,
          f.Amount,
          f.Description,
          f.Filepath,
          f.IsConfirmedByExpert,
          f.IsConfirmedByDeputy,
          f.IsConfirmedByResearchDirector,
          f.IsConfirmedByUniversityDeputy,
          f.ProfessorNationalCode
        FROM factors f
        WHERE f.FactorID = @factorId
      `);
    
    res.status(200).json(updatedFactor.recordset[0]);
    
  } catch (err) {
    await transaction.rollback();
    console.error("Error updating factor:", err);
    res.status(500).json({ message: err.message });
  }
});
 ///  AND t.Deputy_Expert_Confirmation = 1
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(3001, '0.0.0.0', () => console.log('Server running on port 3001'));