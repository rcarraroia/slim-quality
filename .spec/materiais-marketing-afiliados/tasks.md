# Tasks: Materiais de Marketing para Afiliados

## ✅ Phase 1: Database & Backend (DONE)
- [x] **Database Schema**
    - [x] Create table `marketing_materials` (without `tenant_id` for now)
    - [x] Create RLS policies (Admin: all, Authenticated: read active)
    - [x] Create Storage Bucket `marketing-materials`
- [x] **Backend Logic**
    - [x] Update `src/types/database.types.ts` manually

## ✅ Phase 2: Frontend Admin (Painel Interno) (DONE)
- [x] **Service**
    - [x] Create `services/admin-marketing.service.ts`
- [x] **Pages**
    - [x] Create route `/dashboard/materiais`
    - [x] Implement listing and CRUD form
    - [x] Add sidebar menu item

## ✅ Phase 3: Frontend Affiliate (Painel Afiliado) (DONE)
- [x] **Service**
    - [x] Update `affiliate.service.ts` with `getMarketingMaterials`
    - [x] Create `utils/interpolation.ts` for magic links (`{{LINK}}` replacement)
- [x] **Components**
    - [x] Create `MaterialCard` (with Copy/Download interaction)
    - [x] Create filters (Image, Video, Text)
- [x] **Pages**
    - [x] Create route `/afiliados/dashboard/materiais`
    - [x] Implement Grid Layout (Masonry-like)
    - [x] Add interpolation logic on user side
- [x] **UI/UX**
    - [x] Ensure premium design (no generic UI)
    - [x] Add micro-animations (hover effects)

## ✅ Phase 4: Validation & Rollout (DONE)
- [x] **Testing**
    - [x] Verify magic link replacement
    - [x] Test file downloads (images/videos)
    - [x] Validate responsive layout on mobile
