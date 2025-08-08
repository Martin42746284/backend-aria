import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const prisma = new PrismaClient();

// Configuration des données par défaut
const DEFAULT_ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@aria-creative.com',
  password: process.env.ADMIN_PASSWORD || 'admin123',
  name: 'Administrateur',
  role: 'ADMIN' // Utilisation d'une constante en majuscules pour les rôles
};

const DEFAULT_PROJECTS = [
  {
    title: "CGEPRO",
    description: "Votre spécialiste du bois exotique et des aménagements extérieurs sur La Réunion",
    technologies: ["WordPress", "PHP", "MySQL", "SEO"],
    client: "CGEPRO",
    duration: "2 mois",
    status: "TERMINE",
    imageUrl: "/uploads/projects/cgepro.jpg",
    date: new Date("2024-03-15"),
    url: "https://cgepro.com"
  },
  {
    title: "ERIC RABY",
    description: "Coaching en compétences sociales et émotionnelles",
    technologies: ["React", "Node.js", "Stripe", "Calendar API"],
    client: "Eric Raby Coaching",
    duration: "3 mois",
    status: "TERMINE",
    imageUrl: "/uploads/projects/eric.jpg",
    date: new Date("2024-04-22"),
    url: "https://eric-raby.com"
  },
  {
      title: "CONNECT TALENT",
      description: "Plateforme de mise en relation entre entreprises et talents africains",
      technologies: ["Vue.js", "Laravel", "PostgreSQL", "Socket.io"],
      client: "Connect Talent Inc",
      duration: "5 mois",
      status: "TERMINE",
      imageUrl: "/uploads/projects/connect.png",
      date: "10/05/2024",
      url: "https://connecttalent.cc"
    },
    {
      title: "SOA DIA TRAVEL",
      description: "Transport & Logistique à Madagascar",
      technologies: ["Angular", "Express.js", "MongoDB", "Maps API"],
      client: "SOA DIA TRAVEL",
      duration: "4 mois",
      status: "TERMINE",
      imageUrl: "/uploads/projects/soa.jpg",
      date: "28/06/2024",
      url: "https://soatransplus.mg"
    },
    {
      title: "Site E-commerce Fashion",
      description: "Développement d'une plateforme e-commerce complète avec système de paiement intégré",
      technologies: ["React", "Node.js", "MongoDB", "Stripe"],
      client: "Fashion Boutique",
      duration: "3 mois",
      status: "TERMINE",
      imageUrl: null,
      date: "15/06/2024",
      url: "https://fashion-boutique.com"
    },
    {
      title: "Application Mobile Banking",
      description: "Application mobile sécurisée pour la gestion bancaire avec authentification biométrique",
      technologies: ["React Native", "Firebase", "Redux"],
      client: "BankTech Solutions",
      duration: "6 mois",
      status: "EN_COURS",
      imageUrl: null,
      date: "01/07/2024",
      url: null
    }
];

async function createAdminUser() {
  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 12);
  
  return await prisma.user.upsert({
    where: { email: DEFAULT_ADMIN.email },
    update: {
      password: hashedPassword,
      name: DEFAULT_ADMIN.name,
      role: DEFAULT_ADMIN.role
    },
    create: {
      email: DEFAULT_ADMIN.email,
      password: hashedPassword,
      name: DEFAULT_ADMIN.name,
      role: DEFAULT_ADMIN.role
    }
  });
}

async function seedProjects() {
  const existingCount = await prisma.project.count();
  
  if (existingCount > 0) {
    console.log(`⏩ ${existingCount} projets existent déjà, skip...`);
    return;
  }

  const projectsToCreate = DEFAULT_PROJECTS.map(project => ({
    ...project,
    technologies: JSON.stringify(project.technologies),
    date: project.date, // Utilisation directe de l'objet Date
    slug: project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }));

  const createdProjects = await prisma.project.createMany({
    data: projectsToCreate,
    skipDuplicates: true
  });

  return createdProjects.count;
}

async function main() {
  console.log('\n🌱 Début du seeding...');

  // 1. Créer l'utilisateur admin
  console.log('\n👤 Création de l\'utilisateur admin...');
  const admin = await createAdminUser();
  console.log(`✅ Admin créé/mis à jour: ${admin.email} (ID: ${admin.id})`);

  // 2. Créer les catégories si nécessaire
  console.log('\n🏷️  Vérification des catégories...');
  const categories = ['Site Web', 'Application', 'E-commerce', 'Mobile'];
  await prisma.category.createMany({
    data: categories.map(name => ({ name })),
    skipDuplicates: true
  });
  console.log(`✅ ${categories.length} catégories disponibles`);

  // 3. Créer les projets
  console.log('\n📂 Création des projets...');
  const projectCount = await seedProjects();
  if (projectCount) {
    console.log(`✅ ${projectCount} projets créés avec succès`);
  }

  // 4. Lier projets et catégories
  console.log('\n🔗 Association projets/catégories...');
  const allProjects = await prisma.project.findMany();
  const webCategory = await prisma.category.findFirst({ where: { name: 'Site Web' }});
  
  if (webCategory) {
    await Promise.all(
      allProjects.map(project => 
        prisma.projectCategory.create({
          data: {
            projectId: project.id,
            categoryId: webCategory.id
          }
        })
      )
    );
    console.log(`✅ ${allProjects.length} projets associés à la catégorie "Site Web"`);
  }

  console.log('\n🎉 Seeding terminé avec succès !');
}

main()
  .catch((e) => {
    console.error('\n❌ Erreur lors du seeding:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });