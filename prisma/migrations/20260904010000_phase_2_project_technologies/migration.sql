CREATE TYPE "TechnologyCategory" AS ENUM (
  'LANGUAGE',
  'FRAMEWORK',
  'LIBRARY',
  'DATABASE',
  'RUNTIME',
  'ORM_DATA',
  'TESTING',
  'BUILD_TOOL',
  'INFRASTRUCTURE',
  'PLATFORM',
  'TOOL',
  'OTHER'
);

CREATE TABLE "technology" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "name" VARCHAR(80) NOT NULL,
  "slug" VARCHAR(80) NOT NULL,
  "category" "TechnologyCategory" NOT NULL,
  "iconKey" VARCHAR(80),
  "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "technology_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "technology_userId_slug_key" UNIQUE NULLS NOT DISTINCT ("userId", "slug"),
  CONSTRAINT "technology_name_not_blank" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "technology_slug_not_blank" CHECK (length(btrim("slug")) > 0),
  CONSTRAINT "technology_ownership_valid" CHECK (
    ("isBuiltIn" = true AND "userId" IS NULL)
    OR ("isBuiltIn" = false AND "userId" IS NOT NULL)
  )
);

CREATE TABLE "engineering_project_technology" (
  "engineeringProjectId" TEXT NOT NULL,
  "technologyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "engineering_project_technology_pkey" PRIMARY KEY ("engineeringProjectId", "technologyId")
);

CREATE INDEX "technology_isBuiltIn_category_name_idx" ON "technology"("isBuiltIn", "category", "name");
CREATE INDEX "engineering_project_technology_technologyId_idx" ON "engineering_project_technology"("technologyId");

ALTER TABLE "technology"
  ADD CONSTRAINT "technology_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "engineering_project_technology"
  ADD CONSTRAINT "engineering_project_technology_engineeringProjectId_fkey"
  FOREIGN KEY ("engineeringProjectId") REFERENCES "engineering_project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "engineering_project_technology"
  ADD CONSTRAINT "engineering_project_technology_technologyId_fkey"
  FOREIGN KEY ("technologyId") REFERENCES "technology"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Built-ins are global canonical records. Icon keys are Simple Icons slugs;
-- null means the UI deliberately uses the generic code fallback.
INSERT INTO "technology" ("id", "name", "slug", "category", "iconKey", "isBuiltIn", "updatedAt") VALUES
  ('builtin-tech-javascript', 'JavaScript', 'javascript', 'LANGUAGE', 'javascript', true, CURRENT_TIMESTAMP),
  ('builtin-tech-typescript', 'TypeScript', 'typescript', 'LANGUAGE', 'typescript', true, CURRENT_TIMESTAMP),
  ('builtin-tech-python', 'Python', 'python', 'LANGUAGE', 'python', true, CURRENT_TIMESTAMP),
  ('builtin-tech-java', 'Java', 'java', 'LANGUAGE', 'openjdk', true, CURRENT_TIMESTAMP),
  ('builtin-tech-csharp', 'C#', 'c-sharp', 'LANGUAGE', 'dotnet', true, CURRENT_TIMESTAMP),
  ('builtin-tech-c', 'C', 'c', 'LANGUAGE', 'c', true, CURRENT_TIMESTAMP),
  ('builtin-tech-cpp', 'C++', 'c-plus-plus', 'LANGUAGE', 'cplusplus', true, CURRENT_TIMESTAMP),
  ('builtin-tech-go', 'Go', 'go', 'LANGUAGE', 'go', true, CURRENT_TIMESTAMP),
  ('builtin-tech-rust', 'Rust', 'rust', 'LANGUAGE', 'rust', true, CURRENT_TIMESTAMP),
  ('builtin-tech-php', 'PHP', 'php', 'LANGUAGE', 'php', true, CURRENT_TIMESTAMP),
  ('builtin-tech-ruby', 'Ruby', 'ruby', 'LANGUAGE', 'ruby', true, CURRENT_TIMESTAMP),
  ('builtin-tech-kotlin', 'Kotlin', 'kotlin', 'LANGUAGE', 'kotlin', true, CURRENT_TIMESTAMP),
  ('builtin-tech-swift', 'Swift', 'swift', 'LANGUAGE', 'swift', true, CURRENT_TIMESTAMP),
  ('builtin-tech-dart', 'Dart', 'dart', 'LANGUAGE', 'dart', true, CURRENT_TIMESTAMP),
  ('builtin-tech-nextjs', 'Next.js', 'next-js', 'FRAMEWORK', 'nextdotjs', true, CURRENT_TIMESTAMP),
  ('builtin-tech-vue', 'Vue', 'vue', 'FRAMEWORK', 'vuedotjs', true, CURRENT_TIMESTAMP),
  ('builtin-tech-nuxt', 'Nuxt', 'nuxt', 'FRAMEWORK', 'nuxt', true, CURRENT_TIMESTAMP),
  ('builtin-tech-angular', 'Angular', 'angular', 'FRAMEWORK', 'angular', true, CURRENT_TIMESTAMP),
  ('builtin-tech-svelte', 'Svelte', 'svelte', 'FRAMEWORK', 'svelte', true, CURRENT_TIMESTAMP),
  ('builtin-tech-sveltekit', 'SvelteKit', 'sveltekit', 'FRAMEWORK', 'svelte', true, CURRENT_TIMESTAMP),
  ('builtin-tech-astro', 'Astro', 'astro', 'FRAMEWORK', 'astro', true, CURRENT_TIMESTAMP),
  ('builtin-tech-express', 'Express', 'express', 'FRAMEWORK', 'express', true, CURRENT_TIMESTAMP),
  ('builtin-tech-nestjs', 'NestJS', 'nestjs', 'FRAMEWORK', 'nestjs', true, CURRENT_TIMESTAMP),
  ('builtin-tech-fastify', 'Fastify', 'fastify', 'FRAMEWORK', 'fastify', true, CURRENT_TIMESTAMP),
  ('builtin-tech-django', 'Django', 'django', 'FRAMEWORK', 'django', true, CURRENT_TIMESTAMP),
  ('builtin-tech-flask', 'Flask', 'flask', 'FRAMEWORK', 'flask', true, CURRENT_TIMESTAMP),
  ('builtin-tech-fastapi', 'FastAPI', 'fastapi', 'FRAMEWORK', 'fastapi', true, CURRENT_TIMESTAMP),
  ('builtin-tech-laravel', 'Laravel', 'laravel', 'FRAMEWORK', 'laravel', true, CURRENT_TIMESTAMP),
  ('builtin-tech-springboot', 'Spring Boot', 'spring-boot', 'FRAMEWORK', 'springboot', true, CURRENT_TIMESTAMP),
  ('builtin-tech-aspnet', 'ASP.NET Core', 'asp-net-core', 'FRAMEWORK', 'dotnet', true, CURRENT_TIMESTAMP),
  ('builtin-tech-react', 'React', 'react', 'LIBRARY', 'react', true, CURRENT_TIMESTAMP),
  ('builtin-tech-tailwindcss', 'Tailwind CSS', 'tailwind-css', 'LIBRARY', 'tailwindcss', true, CURRENT_TIMESTAMP),
  ('builtin-tech-nodejs', 'Node.js', 'node-js', 'RUNTIME', 'nodedotjs', true, CURRENT_TIMESTAMP),
  ('builtin-tech-bun', 'Bun', 'bun', 'RUNTIME', 'bun', true, CURRENT_TIMESTAMP),
  ('builtin-tech-postgresql', 'PostgreSQL', 'postgresql', 'DATABASE', 'postgresql', true, CURRENT_TIMESTAMP),
  ('builtin-tech-mysql', 'MySQL', 'mysql', 'DATABASE', 'mysql', true, CURRENT_TIMESTAMP),
  ('builtin-tech-sqlite', 'SQLite', 'sqlite', 'DATABASE', 'sqlite', true, CURRENT_TIMESTAMP),
  ('builtin-tech-mongodb', 'MongoDB', 'mongodb', 'DATABASE', 'mongodb', true, CURRENT_TIMESTAMP),
  ('builtin-tech-redis', 'Redis', 'redis', 'DATABASE', 'redis', true, CURRENT_TIMESTAMP),
  ('builtin-tech-firebase', 'Firebase', 'firebase', 'DATABASE', 'firebase', true, CURRENT_TIMESTAMP),
  ('builtin-tech-supabase', 'Supabase', 'supabase', 'DATABASE', 'supabase', true, CURRENT_TIMESTAMP),
  ('builtin-tech-prisma', 'Prisma', 'prisma', 'ORM_DATA', 'prisma', true, CURRENT_TIMESTAMP),
  ('builtin-tech-mongoose', 'Mongoose', 'mongoose', 'ORM_DATA', 'mongoose', true, CURRENT_TIMESTAMP),
  ('builtin-tech-drizzle', 'Drizzle', 'drizzle', 'ORM_DATA', 'drizzle', true, CURRENT_TIMESTAMP),
  ('builtin-tech-typeorm', 'TypeORM', 'typeorm', 'ORM_DATA', 'typeorm', true, CURRENT_TIMESTAMP),
  ('builtin-tech-sequelize', 'Sequelize', 'sequelize', 'ORM_DATA', 'sequelize', true, CURRENT_TIMESTAMP),
  ('builtin-tech-vite', 'Vite', 'vite', 'BUILD_TOOL', 'vite', true, CURRENT_TIMESTAMP),
  ('builtin-tech-webpack', 'Webpack', 'webpack', 'BUILD_TOOL', 'webpack', true, CURRENT_TIMESTAMP),
  ('builtin-tech-turbopack', 'Turbopack', 'turbopack', 'BUILD_TOOL', NULL, true, CURRENT_TIMESTAMP),
  ('builtin-tech-npm', 'npm', 'npm', 'BUILD_TOOL', 'npm', true, CURRENT_TIMESTAMP),
  ('builtin-tech-pnpm', 'pnpm', 'pnpm', 'BUILD_TOOL', 'pnpm', true, CURRENT_TIMESTAMP),
  ('builtin-tech-yarn', 'Yarn', 'yarn', 'BUILD_TOOL', 'yarn', true, CURRENT_TIMESTAMP),
  ('builtin-tech-vitest', 'Vitest', 'vitest', 'TESTING', 'vitest', true, CURRENT_TIMESTAMP),
  ('builtin-tech-jest', 'Jest', 'jest', 'TESTING', 'jest', true, CURRENT_TIMESTAMP),
  ('builtin-tech-playwright', 'Playwright', 'playwright', 'TESTING', NULL, true, CURRENT_TIMESTAMP),
  ('builtin-tech-cypress', 'Cypress', 'cypress', 'TESTING', 'cypress', true, CURRENT_TIMESTAMP),
  ('builtin-tech-phpunit', 'PHPUnit', 'phpunit', 'TESTING', NULL, true, CURRENT_TIMESTAMP),
  ('builtin-tech-docker', 'Docker', 'docker', 'INFRASTRUCTURE', 'docker', true, CURRENT_TIMESTAMP),
  ('builtin-tech-kubernetes', 'Kubernetes', 'kubernetes', 'INFRASTRUCTURE', 'kubernetes', true, CURRENT_TIMESTAMP),
  ('builtin-tech-nginx', 'Nginx', 'nginx', 'INFRASTRUCTURE', 'nginx', true, CURRENT_TIMESTAMP),
  ('builtin-tech-caddy', 'Caddy', 'caddy', 'INFRASTRUCTURE', 'caddy', true, CURRENT_TIMESTAMP),
  ('builtin-tech-aws', 'AWS', 'aws', 'PLATFORM', NULL, true, CURRENT_TIMESTAMP),
  ('builtin-tech-azure', 'Microsoft Azure', 'microsoft-azure', 'PLATFORM', NULL, true, CURRENT_TIMESTAMP),
  ('builtin-tech-googlecloud', 'Google Cloud', 'google-cloud', 'PLATFORM', 'googlecloud', true, CURRENT_TIMESTAMP),
  ('builtin-tech-cloudflare', 'Cloudflare', 'cloudflare', 'PLATFORM', 'cloudflare', true, CURRENT_TIMESTAMP),
  ('builtin-tech-vercel', 'Vercel', 'vercel', 'PLATFORM', 'vercel', true, CURRENT_TIMESTAMP),
  ('builtin-tech-netlify', 'Netlify', 'netlify', 'PLATFORM', 'netlify', true, CURRENT_TIMESTAMP),
  ('builtin-tech-hetzner', 'Hetzner', 'hetzner', 'PLATFORM', 'hetzner', true, CURRENT_TIMESTAMP),
  ('builtin-tech-github', 'GitHub', 'github', 'PLATFORM', 'github', true, CURRENT_TIMESTAMP),
  ('builtin-tech-git', 'Git', 'git', 'TOOL', 'git', true, CURRENT_TIMESTAMP);
