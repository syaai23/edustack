const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create default roles
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'super_admin' },
    update: {},
    create: {
      name: 'super_admin',
      description: 'Super Administrator with full system access',
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator with system management access',
    },
  });

  const moderatorRole = await prisma.role.upsert({
    where: { name: 'moderator' },
    update: {},
    create: {
      name: 'moderator',
      description: 'Moderator with content management access',
    },
  });

  const tutorRole = await prisma.role.upsert({
    where: { name: 'tutor' },
    update: {},
    create: {
      name: 'tutor',
      description: 'Tutor with course creation and management access',
    },
  });

  const studentRole = await prisma.role.upsert({
    where: { name: 'student' },
    update: {},
    create: {
      name: 'student',
      description: 'Student with course enrollment and learning access',
    },
  });

  console.log('✅ Roles created successfully');

  // Create permissions
  const permissions = [
    { name: 'create_course', description: 'Create new courses', resource: 'course', action: 'create' },
    { name: 'read_course', description: 'View courses', resource: 'course', action: 'read' },
    { name: 'update_course', description: 'Update courses', resource: 'course', action: 'update' },
    { name: 'delete_course', description: 'Delete courses', resource: 'course', action: 'delete' },
    { name: 'manage_users', description: 'Manage users', resource: 'user', action: 'manage' },
    { name: 'manage_payments', description: 'Manage payments', resource: 'payment', action: 'manage' },
    { name: 'moderate_content', description: 'Moderate content', resource: 'content', action: 'moderate' },
    { name: 'view_analytics', description: 'View analytics', resource: 'analytics', action: 'read' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }

  console.log('✅ Permissions created successfully');

  // Assign permissions to roles
  const rolePermissions = [
    { roleName: 'super_admin', permissions: permissions.map(p => p.name) },
    { roleName: 'admin', permissions: ['manage_users', 'moderate_content', 'view_analytics'] },
    { roleName: 'moderator', permissions: ['moderate_content', 'read_course'] },
    { roleName: 'tutor', permissions: ['create_course', 'read_course', 'update_course', 'view_analytics'] },
    { roleName: 'student', permissions: ['read_course'] },
  ];

  for (const rp of rolePermissions) {
    const role = await prisma.role.findUnique({ where: { name: rp.roleName } });
    
    for (const permissionName of rp.permissions) {
      const permission = await prisma.permission.findUnique({ where: { name: permissionName } });
      
      if (role && permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }
  }

  console.log('✅ Role permissions assigned successfully');

  // Create categories
  const categories = [
    { name: 'Programming & Development', slug: 'programming-development', description: 'Software development and programming courses' },
    { name: 'Data Science & Analytics', slug: 'data-science-analytics', description: 'Data science, machine learning, and analytics courses' },
    { name: 'Design & Creative', slug: 'design-creative', description: 'Design, art, and creative courses' },
    { name: 'Business & Entrepreneurship', slug: 'business-entrepreneurship', description: 'Business skills and entrepreneurship courses' },
    { name: 'Marketing & Sales', slug: 'marketing-sales', description: 'Marketing, sales, and digital marketing courses' },
    { name: 'Language Learning', slug: 'language-learning', description: 'Language learning courses' },
    { name: 'Personal Development', slug: 'personal-development', description: 'Personal growth and development courses' },
    { name: 'Health & Fitness', slug: 'health-fitness', description: 'Health, fitness, and wellness courses' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log('✅ Categories created successfully');

  // Create a demo super admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@edustack.com' },
    update: {},
    create: {
      email: 'admin@edustack.com',
      username: 'admin',
      firstName: 'Super',
      lastName: 'Admin',
      password: hashedPassword,
      isActive: true,
      isVerified: true,
    },
  });

  // Assign super admin role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: superAdminRole.id,
    },
  });

  // Create admin profile
  await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      level: 'SUPER_ADMIN',
    },
  });

  console.log('✅ Demo admin user created successfully');

  // Create a demo tutor
  const tutorPassword = await bcrypt.hash('tutor123', 12);
  
  const tutorUser = await prisma.user.upsert({
    where: { email: 'tutor@edustack.com' },
    update: {},
    create: {
      email: 'tutor@edustack.com',
      username: 'demo_tutor',
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Experienced software developer and instructor with 10+ years in the industry.',
      password: tutorPassword,
      isActive: true,
      isVerified: true,
    },
  });

  // Assign tutor role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: tutorUser.id,
        roleId: tutorRole.id,
      },
    },
    update: {},
    create: {
      userId: tutorUser.id,
      roleId: tutorRole.id,
    },
  });

  // Create tutor profile
  const tutorProfile = await prisma.tutor.upsert({
    where: { userId: tutorUser.id },
    update: {},
    create: {
      userId: tutorUser.id,
      title: 'Senior Software Engineer & Instructor',
      expertise: ['JavaScript', 'Node.js', 'React', 'Python', 'PostgreSQL'],
      experience: 10,
      education: 'M.S. Computer Science, Stanford University',
      certifications: ['AWS Certified Solutions Architect', 'Google Cloud Professional'],
      teachingStyle: 'Hands-on, project-based learning with real-world examples',
      languages: ['English', 'Spanish'],
      hourlyRate: 75.0,
      isApproved: true,
    },
  });

  console.log('✅ Demo tutor created successfully');

  // Create a demo student
  const studentPassword = await bcrypt.hash('student123', 12);
  
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@edustack.com' },
    update: {},
    create: {
      email: 'student@edustack.com',
      username: 'demo_student',
      firstName: 'Jane',
      lastName: 'Smith',
      bio: 'Passionate learner interested in web development and data science.',
      password: studentPassword,
      isActive: true,
      isVerified: true,
    },
  });

  // Assign student role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: studentUser.id,
        roleId: studentRole.id,
      },
    },
    update: {},
    create: {
      userId: studentUser.id,
      roleId: studentRole.id,
    },
  });

  // Create student profile
  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      educationLevel: 'UNDERGRADUATE',
      interests: ['Web Development', 'Data Science', 'Machine Learning'],
      goals: 'Become a full-stack developer and transition into tech career',
      learningStyle: 'VISUAL',
      preferredLanguages: ['English'],
    },
  });

  console.log('✅ Demo student created successfully');

  // Create a demo course
  const programmingCategory = await prisma.category.findUnique({
    where: { slug: 'programming-development' }
  });

  if (programmingCategory && tutorProfile) {
    const demoCourse = await prisma.course.upsert({
      where: { slug: 'complete-javascript-bootcamp' },
      update: {},
      create: {
        title: 'Complete JavaScript Bootcamp 2024',
        description: 'Master JavaScript from basics to advanced concepts. Learn ES6+, async programming, DOM manipulation, and modern JavaScript frameworks. Build real-world projects and become job-ready.',
        shortDescription: 'Comprehensive JavaScript course from beginner to advanced level',
        slug: 'complete-javascript-bootcamp',
        price: 99.99,
        originalPrice: 199.99,
        level: 'BEGINNER',
        duration: 4800, // 80 hours
        language: 'en',
        status: 'PUBLISHED',
        isPublished: true,
        publishedAt: new Date(),
        metaTitle: 'Complete JavaScript Bootcamp - Learn JavaScript from Scratch',
        metaDescription: 'Master JavaScript with our comprehensive bootcamp. From basics to advanced concepts, build real projects and become job-ready.',
        tags: ['JavaScript', 'Web Development', 'Programming', 'ES6', 'Node.js'],
        tutorId: tutorProfile.id,
        categoryId: programmingCategory.id,
        requirements: ['Basic computer skills', 'No prior programming experience needed', 'Computer with internet connection'],
        whatYouLearn: [
          'Master JavaScript fundamentals and advanced concepts',
          'Build interactive web applications',
          'Understand ES6+ features and modern JavaScript',
          'Work with APIs and asynchronous programming',
          'Create dynamic DOM manipulation',
          'Build real-world projects for your portfolio'
        ],
        targetAudience: [
          'Complete beginners who want to learn programming',
          'Students looking to master JavaScript',
          'Developers wanting to update their JavaScript skills',
          'Anyone interested in web development'
        ],
      },
    });

    // Create course sections and lessons
    const section1 = await prisma.section.create({
      data: {
        title: 'JavaScript Fundamentals',
        description: 'Learn the core concepts of JavaScript programming',
        courseId: demoCourse.id,
        sortOrder: 1,
      },
    });

    const lessons1 = [
      {
        title: 'Introduction to JavaScript',
        description: 'What is JavaScript and why learn it?',
        contentType: 'VIDEO',
        content: { videoUrl: 'https://example.com/video1.mp4', duration: 600 },
        isPreview: true,
        sortOrder: 1,
      },
      {
        title: 'Variables and Data Types',
        description: 'Understanding JavaScript variables and data types',
        contentType: 'VIDEO',
        content: { videoUrl: 'https://example.com/video2.mp4', duration: 900 },
        sortOrder: 2,
      },
      {
        title: 'Functions and Scope',
        description: 'Master JavaScript functions and scope concepts',
        contentType: 'VIDEO',
        content: { videoUrl: 'https://example.com/video3.mp4', duration: 1200 },
        sortOrder: 3,
      },
    ];

    for (const lesson of lessons1) {
      await prisma.lesson.create({
        data: {
          ...lesson,
          sectionId: section1.id,
        },
      });
    }

    const section2 = await prisma.section.create({
      data: {
        title: 'Advanced JavaScript Concepts',
        description: 'Dive deep into advanced JavaScript topics',
        courseId: demoCourse.id,
        sortOrder: 2,
        price: 29.99, // Individual section pricing
      },
    });

    const lessons2 = [
      {
        title: 'Closures and Hoisting',
        description: 'Understanding closures and hoisting in JavaScript',
        contentType: 'VIDEO',
        content: { videoUrl: 'https://example.com/video4.mp4', duration: 1500 },
        sortOrder: 1,
      },
      {
        title: 'Promises and Async/Await',
        description: 'Master asynchronous programming in JavaScript',
        contentType: 'VIDEO',
        content: { videoUrl: 'https://example.com/video5.mp4', duration: 1800 },
        sortOrder: 2,
      },
    ];

    for (const lesson of lessons2) {
      await prisma.lesson.create({
        data: {
          ...lesson,
          sectionId: section2.id,
        },
      });
    }

    console.log('✅ Demo course created successfully');

    // Create demo enrollment
    await prisma.enrollment.create({
      data: {
        studentId: studentUser.id,
        courseId: demoCourse.id,
        progress: 25.0,
        status: 'ACTIVE',
      },
    });

    // Create demo review
    await prisma.review.create({
      data: {
        studentId: studentUser.id,
        courseId: demoCourse.id,
        rating: 5,
        title: 'Excellent JavaScript Course!',
        content: 'This course is fantastic! The instructor explains everything clearly and the projects are very practical. Highly recommended for anyone wanting to learn JavaScript.',
        isPublished: true,
        isVerified: true,
      },
    });

    console.log('✅ Demo enrollment and review created successfully');
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Demo Accounts Created:');
  console.log('Admin: admin@edustack.com / admin123');
  console.log('Tutor: tutor@edustack.com / tutor123');
  console.log('Student: student@edustack.com / student123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
