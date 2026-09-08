-- Phase 1 of the "granular categories" plan: vendors move from one
-- category to a jsonb array of categories, so a vendor that does
-- several trades (e.g. Kaleb Services: HVAC + Electrical + Flooring +
-- Fencing + Notary + Remodeling + Railings) can actually be found under
-- each one, instead of being filed under a single umbrella bucket.
--
-- The old `category` and `specialty` text columns are left in place
-- (unused going forward) rather than dropped, so this migration has
-- nothing destructive in it.

alter table vendors
  add column if not exists categories jsonb not null default '[]'::jsonb;

-- The app no longer writes `category` (singular) going forward — it's
-- left in place as unused historical data rather than dropped, so it
-- can't stay `not null` or every new vendor insert would fail.
alter table vendors alter column category drop not null;

-- Backfill computed from the live data on 2026-09-08 — every vendor's
-- old category + free-text specialty, mapped to the new granular
-- category names. See the "Community Demand Roadmap" plan discussion
-- for the full category list and reasoning.
update vendors set categories = '["Rideshare & Transportation"]'::jsonb where id = 'b271e34c-5ab4-499b-967b-041b52c3a376';
update vendors set categories = '["Rideshare & Transportation"]'::jsonb where id = '2025f4ff-5b36-4443-98d3-bcb6342c70cb';
update vendors set categories = '["Auto Repair"]'::jsonb where id = '366d252f-6fe3-41bf-9099-72e481b8e844';
update vendors set categories = '["Boat Rental & Marine"]'::jsonb where id = '5e948838-de42-4d56-a951-3f251e08ed51';
update vendors set categories = '["Auto Repair"]'::jsonb where id = '54e63c14-c46b-40f1-921c-e19544dc5a0a';
update vendors set categories = '["Rideshare & Transportation"]'::jsonb where id = 'ed5a50e5-cd07-4699-b2bc-55064f90274d';
update vendors set categories = '["Auto Repair"]'::jsonb where id = 'd438d900-7ef8-4268-aa39-9b85ee0e519a';
update vendors set categories = '["Boat Rental & Marine"]'::jsonb where id = '7ac6edb9-4532-4a53-bf26-9f62a10153cb';
update vendors set categories = '["Auto Repair"]'::jsonb where id = 'a2d6f61a-92de-4b61-ae83-a424dba617cd';
update vendors set categories = '["Auto Repair"]'::jsonb where id = '239cc0bd-af55-437f-8118-0359d91b462a';
update vendors set categories = '["Air Duct & Dryer Vent Cleaning"]'::jsonb where id = '98932e68-a0fb-4036-a4be-901967368b30';
update vendors set categories = '["Air Duct & Dryer Vent Cleaning"]'::jsonb where id = '48ecfbc8-7989-4ee2-b4cb-b117c06c4e77';
update vendors set categories = '["Air Duct & Dryer Vent Cleaning","Appliance Repair"]'::jsonb where id = 'e5936fd1-38b4-4c32-85f7-2f4500bdf96e';
update vendors set categories = '["Office & Commercial Cleaning"]'::jsonb where id = '512c3251-7cdf-48b0-9ba1-498445bc5665';
update vendors set categories = '["House Cleaning"]'::jsonb where id = 'c2e0b087-9990-41e8-8bb0-208e1ddffd9b';
update vendors set categories = '["House Cleaning","Office & Commercial Cleaning"]'::jsonb where id = '9cea8bee-7445-4fda-97a6-1c3a8410082c';
update vendors set categories = '["House Cleaning"]'::jsonb where id = '810d5940-bddd-4ad9-b4da-93eb309db678';
update vendors set categories = '["House Cleaning"]'::jsonb where id = '6c4f2eaa-1992-4f33-a3c5-e11a6ea0ff64';
update vendors set categories = '["Pressure Washing"]'::jsonb where id = 'f1c39c57-42b6-407d-9366-7b0edf76d398';
update vendors set categories = '["House Cleaning"]'::jsonb where id = '4d7eeb11-b740-4aad-baa3-0d29dbfd756e';
update vendors set categories = '["House Cleaning"]'::jsonb where id = '4e74252d-549d-467f-835a-e54fa24e67f4';
update vendors set categories = '["Food"]'::jsonb where id = '19ae265d-6dd8-4389-a7d0-f966e42d4909';
update vendors set categories = '["Food"]'::jsonb where id = '6a38aa44-9587-48d8-91f8-446ff5dbd43d';
update vendors set categories = '["Food"]'::jsonb where id = 'b54c7228-6665-4a08-af94-fd842037d600';
update vendors set categories = '["Food"]'::jsonb where id = '4f559903-d556-42ff-bda0-7c3e8e388dbd';
update vendors set categories = '["Food"]'::jsonb where id = 'ecbe64dd-0d16-4a6c-b621-4c42e10b5906';
update vendors set categories = '["Food"]'::jsonb where id = '7df040c6-c984-4fd8-acaf-96ba4deb2519';
update vendors set categories = '["Health & Wellness"]'::jsonb where id = '2234f737-aab3-4dc9-99c9-9b3291207239';
update vendors set categories = '["Health & Wellness"]'::jsonb where id = '715dc13a-3c81-4777-860c-7e68698b7a7b';
update vendors set categories = '["Health & Wellness"]'::jsonb where id = '2fee706a-b8c1-4eda-8399-73293d068f74';
update vendors set categories = '["Health & Wellness"]'::jsonb where id = '355a83d5-3d43-4c45-ade6-750b892e366b';
update vendors set categories = '["Plumbing"]'::jsonb where id = '3af6750f-6223-4f36-85b5-1c74c385cf66';
update vendors set categories = '["Plumbing"]'::jsonb where id = 'aa4e2f23-7ba5-4160-8206-a6965f9005e9';
update vendors set categories = '["HVAC"]'::jsonb where id = '66790351-3c7a-4ab0-b8f9-f6ea480b409e';
update vendors set categories = '["HVAC"]'::jsonb where id = '307ff101-0e3b-404b-a0a4-2a954fca0068';
update vendors set categories = '["Appliance Repair"]'::jsonb where id = '2bab95d0-c7c1-44fa-b52c-403d2e4e4c3e';
update vendors set categories = '["Appliance Repair"]'::jsonb where id = '3ba78e16-fe88-454b-8081-394f174081e3';
update vendors set categories = '["Plumbing"]'::jsonb where id = 'bde178c5-ecfa-4372-8b34-b53f2df3e29d';
update vendors set categories = '["Handyman"]'::jsonb where id = '93235e92-3bcd-49ea-97bf-3f8a16d921b3';
update vendors set categories = '["Plumbing"]'::jsonb where id = 'd3740e72-6253-45b0-83b5-c237e0510879';
update vendors set categories = '["Plumbing"]'::jsonb where id = '77240a0b-b6d7-4fb7-9646-a8059139f099';
update vendors set categories = '["Handyman"]'::jsonb where id = '76f2e108-250f-4c39-aa23-2029a29e6806';
update vendors set categories = '["Handyman"]'::jsonb where id = 'be69ae3c-b07e-400b-8e7c-d1aff2003b07';
update vendors set categories = '["Window Treatments"]'::jsonb where id = '21f74e42-76d8-4df9-a06c-020cfcb7bc92';
update vendors set categories = '["Window Treatments"]'::jsonb where id = 'f61f8aa9-36dc-4e80-9dcb-8fabf13a73c8';
update vendors set categories = '["Plumbing"]'::jsonb where id = '9ede0ea2-173b-414d-9898-1df2b14903e6';
update vendors set categories = '["Plumbing"]'::jsonb where id = '7ca6eadb-5307-4b5f-ae8e-f6a3c65342f5';
update vendors set categories = '["Windows"]'::jsonb where id = 'e18b0b39-4149-41d1-af66-3831ca3facd1';
update vendors set categories = '["Windows"]'::jsonb where id = 'f4777dc2-1f55-4f5f-9203-e247b87dedac';
update vendors set categories = '["Railings"]'::jsonb where id = 'ff80c11c-a221-44db-81ad-b41bfc0af95d';
update vendors set categories = '["Railings"]'::jsonb where id = '8b2811f6-a2e8-4d8b-b90e-e8eae80ed204';
update vendors set categories = '["Railings"]'::jsonb where id = '641355f3-e87d-4cc3-9925-5923e2f37277';
update vendors set categories = '["Fencing"]'::jsonb where id = '484c41fe-046d-409c-bbf7-fe734a8f944e';
update vendors set categories = '["Fencing"]'::jsonb where id = '02073413-c95d-45d8-8952-d17343113c00';
update vendors set categories = '["Window Treatments"]'::jsonb where id = 'a292e22d-6677-4aa3-a395-5562a337e1aa';
update vendors set categories = '["Window Treatments"]'::jsonb where id = 'd5129a06-a4cb-4024-b26d-5bcc4b681456';
update vendors set categories = '["Handyman"]'::jsonb where id = '340f8798-c897-4ca5-9b8b-67b4ef9af179';
update vendors set categories = '["Handyman"]'::jsonb where id = '750710ca-3270-4f81-8c68-8bedc34b5111';
update vendors set categories = '["Remodeling"]'::jsonb where id = '90f5646f-62b5-4a5c-8c24-6ec84f478725';
update vendors set categories = '["Remodeling"]'::jsonb where id = '8cc30a09-e2d5-4126-ada4-e2ee3793d093';
update vendors set categories = '["Plumbing"]'::jsonb where id = 'ba17a827-cd5e-4ad7-b734-33f1dfecc0e0';
update vendors set categories = '["Plumbing"]'::jsonb where id = '07182298-7acb-46e1-95e1-fa4d35e60e85';
update vendors set categories = '["Painting"]'::jsonb where id = '4880b89c-709d-4660-9638-9a3bd3858c55';
update vendors set categories = '["Painting"]'::jsonb where id = '5ef67f81-89b1-4f93-9826-d55039031e92';
update vendors set categories = '["Landscaping"]'::jsonb where id = 'a2bf616f-fd9c-4a0d-860e-2d1ec28d1bc9';
update vendors set categories = '["Landscaping"]'::jsonb where id = 'ebf0b6d2-8272-47a3-bc57-01353eb812f9';
update vendors set categories = '["Remodeling"]'::jsonb where id = 'dc98b9c3-95c1-4df0-a517-30a1ff3c5575';
update vendors set categories = '["Remodeling"]'::jsonb where id = '27eb4879-3076-4cda-852c-6a4ada3c5cff';
update vendors set categories = '["Windows"]'::jsonb where id = '146d82c4-edfb-4f00-afbf-3b00d61a4a55';
update vendors set categories = '["Windows"]'::jsonb where id = 'a7f5cbc3-be91-40b8-8c95-f5d0e85fced0';
update vendors set categories = '["Landscaping"]'::jsonb where id = '7e7f8cde-f5b4-463b-aac2-a6a605cf6805';
update vendors set categories = '["Landscaping"]'::jsonb where id = '6f4250c8-7acf-4cdb-8168-812866bbf438';
update vendors set categories = '["Appliance Repair"]'::jsonb where id = '166c3fe4-0619-4036-91ea-ad256f696388';
update vendors set categories = '["Appliance Repair"]'::jsonb where id = '8e188ec1-fee4-4e0c-adc5-e227eb07530b';
update vendors set categories = '["Electrical"]'::jsonb where id = 'a175c631-bd4b-4d12-9a14-d6a15fba0ed8';
update vendors set categories = '["Electrical"]'::jsonb where id = '43a8d328-0970-42da-9e95-5aa04ab265f7';
update vendors set categories = '["Electrical"]'::jsonb where id = '24da85b6-7987-4084-aa5c-b24e0be04bfd';
update vendors set categories = '["Handyman","Pressure Washing","Painting"]'::jsonb where id = '4822078a-81d6-46d4-953f-aaa6232e0eee';
update vendors set categories = '["Handyman","Pressure Washing","Painting"]'::jsonb where id = '9ad7fca5-5762-4a2b-8e95-d3eda49eb105';
update vendors set categories = '["Railings"]'::jsonb where id = '3d5a68ff-ece6-4d31-a296-568e179b5fc7';
update vendors set categories = '["Railings"]'::jsonb where id = 'e6882ba3-f568-41ee-b9ef-c849f1e761e1';
update vendors set categories = '["Windows"]'::jsonb where id = 'cd89404f-17c3-408a-8d99-05c4ab15ebf9';
update vendors set categories = '["Windows"]'::jsonb where id = '9c87e636-fd72-43a5-b73c-10bfc8bbd12a';
update vendors set categories = '["HVAC"]'::jsonb where id = 'bbfa937f-93d4-41d9-966b-8de39524faec';
update vendors set categories = '["HVAC"]'::jsonb where id = '1c7c7d54-d8b2-4801-a3b6-a7e5bb0a5f4f';
update vendors set categories = '["HVAC"]'::jsonb where id = '99519bf2-210c-4cbd-8e29-478393a58a2f';
update vendors set categories = '["HVAC"]'::jsonb where id = '09b3982b-9e36-4c58-96c4-dd56bc1300ed';
update vendors set categories = '["Plumbing"]'::jsonb where id = '10f59ad9-cf82-46fa-8efb-d86906e9f66f';
update vendors set categories = '["Plumbing"]'::jsonb where id = '9e78225a-5ea6-4d03-86f0-595238d0c6f6';
update vendors set categories = '["Handyman"]'::jsonb where id = 'd719d557-4cdb-492f-a4ab-83e39c0cf83e';
update vendors set categories = '["Handyman"]'::jsonb where id = '7181227d-aaec-4bf1-b8fe-9008da484670';
update vendors set categories = '["Countertops & Stonework"]'::jsonb where id = '875ff01b-027e-4724-b071-96fe9baec74f';
update vendors set categories = '["Countertops & Stonework"]'::jsonb where id = 'f6fbc818-c671-4037-9419-af8a904c1126';
update vendors set categories = '["Countertops & Stonework"]'::jsonb where id = '4db41bfb-9ecd-43e1-bf04-b15257fefe63';
update vendors set categories = '["Electrical"]'::jsonb where id = 'b33be59c-f2a5-4649-a21d-4caaa34ba004';
update vendors set categories = '["Electrical"]'::jsonb where id = 'c01d5acc-17e3-4c06-a3c5-fea4f840f599';
update vendors set categories = '["Electrical"]'::jsonb where id = 'd25146c7-e165-437e-8357-d8f98754de03';
update vendors set categories = '["Landscaping"]'::jsonb where id = '3f14a2d9-3748-4948-8c28-45e80d7092c6';
update vendors set categories = '["Landscaping"]'::jsonb where id = 'faa1a606-e728-4d62-9c5d-4dc4fce80441';
update vendors set categories = '["Flooring","Remodeling"]'::jsonb where id = 'dfcddefd-a6ce-462f-a9bb-305728469313';
update vendors set categories = '["Flooring","Remodeling"]'::jsonb where id = 'e525849f-268c-49ef-9bdd-61ce9465ff98';
update vendors set categories = '["Window Treatments"]'::jsonb where id = 'c39ce0b7-210a-4e4a-b016-d7c9f70fa8d2';
update vendors set categories = '["Window Treatments"]'::jsonb where id = '560a6429-b695-4b8b-a8a4-ad685e015728';
update vendors set categories = '["HVAC","Electrical"]'::jsonb where id = 'c83cc627-4efe-4518-9c90-11f45d8e4229';
update vendors set categories = '["HVAC","Electrical"]'::jsonb where id = '78613d1c-584f-4a49-907e-d41e48cb8f88';
update vendors set categories = '["Painting"]'::jsonb where id = '7002c82c-0ad2-4e55-a87f-8769eb77b043';
update vendors set categories = '["Painting"]'::jsonb where id = '15a571aa-d714-4d60-9fb6-cd9620f51bd1';
update vendors set categories = '["Painting"]'::jsonb where id = '5990bab9-d5f7-48de-bb1f-34b461109b5d';
update vendors set categories = '["Painting"]'::jsonb where id = '0bc7150a-e616-4b4f-b83d-b13b8c0507c2';
update vendors set categories = '["Painting"]'::jsonb where id = '78816f8f-e7f5-4097-9ceb-377fbf921bcf';
update vendors set categories = '["Landscaping"]'::jsonb where id = 'dd47f914-44e1-4331-a6bf-c0bde6ec3c90';
update vendors set categories = '["Landscaping"]'::jsonb where id = 'f3eae1d1-3546-4472-aa0a-5abdde7521e2';
update vendors set categories = '["Electrical"]'::jsonb where id = '8a50783f-9228-40be-aa1e-64e7fb7bca3f';
update vendors set categories = '["Electrical"]'::jsonb where id = 'b1e71af6-4ce1-421f-8d70-83b84eda3722';
update vendors set categories = '["Handyman"]'::jsonb where id = '3e302cda-2f25-4808-9ba6-bea14d6e941d';
update vendors set categories = '["Handyman"]'::jsonb where id = '939c07ed-6dee-47a8-910e-fac0846dda65';
update vendors set categories = '["Handyman"]'::jsonb where id = 'f029265a-53b2-4cde-a0bc-6774f6efad82';
update vendors set categories = '["Handyman"]'::jsonb where id = '08b9746f-292a-4a15-9134-6b5748a5b7c0';
update vendors set categories = '["Handyman"]'::jsonb where id = 'c8d7406d-ba7c-47c8-a111-128336a57c28';
update vendors set categories = '["HVAC","Electrical","Flooring","Fencing","Notary","Remodeling","Railings"]'::jsonb where id = '1ca4980f-d004-476a-9211-e8ad90cf02af';
update vendors set categories = '["HVAC","Electrical","Flooring","Fencing","Notary","Remodeling","Railings"]'::jsonb where id = '26a63062-f096-42bb-9354-870cfeb1c0ae';
update vendors set categories = '["Plumbing"]'::jsonb where id = '089f71c4-ec78-4e73-9701-ce532527f77c';
update vendors set categories = '["Plumbing"]'::jsonb where id = 'c89b5448-d114-4a6b-8ba3-ec990baf8ce6';
update vendors set categories = '["Flooring"]'::jsonb where id = 'dd06ade8-c5bb-4c88-adc6-98fc1c29ee62';
update vendors set categories = '["Flooring"]'::jsonb where id = '4374c750-bbf7-437e-a5f8-43ee1ef781c7';
update vendors set categories = '["Electrical"]'::jsonb where id = '297caac0-c73c-4e89-b39c-c694706063a9';
update vendors set categories = '["Electrical"]'::jsonb where id = '5bfd254b-5f19-4fa3-b63f-b32fb4da26d4';
update vendors set categories = '["Plumbing"]'::jsonb where id = '46bd56e3-955b-4f70-a751-ebf79299cef6';
update vendors set categories = '["Plumbing"]'::jsonb where id = 'd7dd7637-e540-4df9-863b-cf6e7c6c017d';
update vendors set categories = '["Windows"]'::jsonb where id = '4284b8a0-91da-42b4-ae34-a5fd008161f3';
update vendors set categories = '["Windows"]'::jsonb where id = '46d9549a-6a7c-406b-b790-636dc5179272';
update vendors set categories = '["Windows"]'::jsonb where id = '4f3e8d95-0a9c-4ece-9927-1da59850833e';
update vendors set categories = '["Windows"]'::jsonb where id = '080b993f-5c27-4c9d-a9aa-3b37ab49701c';
update vendors set categories = '["Countertops & Stonework"]'::jsonb where id = '20ffc27d-6ba3-4c39-9fa2-c46ba9058b9f';
update vendors set categories = '["Countertops & Stonework"]'::jsonb where id = '25af5e40-ee82-4b34-b7b8-af02c35783ab';
update vendors set categories = '["Windows"]'::jsonb where id = '3a5f242d-3495-4d87-8b2d-8638129b88fe';
update vendors set categories = '["Windows"]'::jsonb where id = '2c2bf532-7815-4ecb-a5a6-fad03edaa1ca';
update vendors set categories = '["HVAC"]'::jsonb where id = 'e333d0b7-009f-4c76-ab42-54ac7f41c5ca';
update vendors set categories = '["HVAC"]'::jsonb where id = '9d7abaa8-ec2d-4022-bd19-c823f22fa203';
update vendors set categories = '["HVAC"]'::jsonb where id = '987f333f-a616-4700-a8e2-dfe0f7805595';
update vendors set categories = '["HVAC"]'::jsonb where id = '08ea2bf2-a730-4704-afea-544996a75e4b';
update vendors set categories = '["Windows"]'::jsonb where id = '2b4d8e61-38ad-407f-8508-3725a5ecaaf7';
update vendors set categories = '["Windows"]'::jsonb where id = 'd11c55ad-e5c9-4701-85d7-012473c301a2';
update vendors set categories = '["Appliance Repair"]'::jsonb where id = 'b94cf835-f1c8-4baf-9931-ac87634070c7';
update vendors set categories = '["Pest Control"]'::jsonb where id = 'd897d1fe-4e1e-4bc9-a872-0cbcf896cdce';
update vendors set categories = '["Pest Control"]'::jsonb where id = '97e73c78-8b51-4b40-b6a0-be247efd8ee2';
update vendors set categories = '["Pest Control"]'::jsonb where id = '2ad0dfaa-3679-4ef8-9d80-853dd39a989a';
update vendors set categories = '["Pest Control"]'::jsonb where id = '5324525a-a474-42fc-a74e-274bfe1bba71';
update vendors set categories = '["Remodeling","Pool","Fencing"]'::jsonb where id = '280715ea-e5ef-413f-9b1d-f0513c541c41';
update vendors set categories = '["Remodeling","Pool","Fencing"]'::jsonb where id = 'cb82de1e-17fb-4584-b322-ba962dc8cdd3';
update vendors set categories = '["Flooring"]'::jsonb where id = 'c6d9b41a-675a-4cc5-af58-3a3fe008c9c4';
update vendors set categories = '["Flooring"]'::jsonb where id = '2abf5d09-70a3-47a7-9cfd-0c77cf945695';
update vendors set categories = '["Window Treatments"]'::jsonb where id = '303c1e47-3aa0-4052-b8b2-8a6e0df792f2';
update vendors set categories = '["Window Treatments"]'::jsonb where id = 'eac0131e-3af7-4026-b0df-a89a679e837d';
update vendors set categories = '["Appliance Repair"]'::jsonb where id = 'b61ea135-6951-4bdc-9198-9d528c061a42';
update vendors set categories = '["Appliance Repair"]'::jsonb where id = 'ef2d8211-e902-446c-8a7a-907e9ab0faf2';
update vendors set categories = '["Flooring"]'::jsonb where id = '06cb1dd7-d31f-47b6-8928-5939cc2d8dc8';
update vendors set categories = '["Flooring"]'::jsonb where id = '837e8067-7135-4cc0-9f4a-5ed816e19073';
update vendors set categories = '["Fencing"]'::jsonb where id = 'f89c3dd6-6036-4a04-8f6d-da8f980ab20f';
update vendors set categories = '["Fencing"]'::jsonb where id = '31ce9f0a-65b8-4352-a60e-4e070da931fa';
update vendors set categories = '["Electrical"]'::jsonb where id = 'b5acbca7-0201-45e1-a7f8-08dd18ad3e8b';
update vendors set categories = '["Electrical"]'::jsonb where id = 'dd74ed87-d50c-497d-a1e4-b93ddc422c69';
update vendors set categories = '["Window Treatments"]'::jsonb where id = '3b049461-fef3-4da5-b754-7229de2b8339';
update vendors set categories = '["Window Treatments"]'::jsonb where id = '28cb98a4-495e-4f56-a307-1898ace895f1';
update vendors set categories = '["Landscaping"]'::jsonb where id = '87479955-1f81-40ef-9954-304d6beeede0';
update vendors set categories = '["Landscaping"]'::jsonb where id = '5ee7cc45-26ab-41f1-a9ba-cfaf2254f646';
update vendors set categories = '["Painting"]'::jsonb where id = '0d07a0fa-1072-40f1-8786-1804702c907e';
update vendors set categories = '["Painting"]'::jsonb where id = 'f4f22fa1-fed2-457a-bf36-964c4bd8be6c';
update vendors set categories = '["HVAC","Appliance Repair"]'::jsonb where id = 'e8c07a02-7fad-4cc1-9195-d7022d6eca6f';
update vendors set categories = '["HVAC","Appliance Repair"]'::jsonb where id = 'f4d3f5de-771d-4914-beae-ce74ada8c8e2';
update vendors set categories = '["Landscaping"]'::jsonb where id = '75f702f3-e1a6-4289-a53b-5b9787933f77';
update vendors set categories = '["Landscaping"]'::jsonb where id = 'c5a5aa6c-4362-47ce-920c-3f3ad3c2c79e';
update vendors set categories = '["Home Insurance"]'::jsonb where id = '0f8a6fa1-5e88-4fce-a987-3ab86739530b';
update vendors set categories = '["Home Insurance"]'::jsonb where id = '3e5bc8fc-55ac-4df0-86e4-2df25e4f4be1';
update vendors set categories = '["Home Insurance"]'::jsonb where id = 'a4d901b3-8c2c-4465-837a-70ca7f66b33d';
update vendors set categories = '["Home Insurance"]'::jsonb where id = 'e256f57b-be46-4399-a2f4-8cfb474f87c8';
update vendors set categories = '["Home Insurance"]'::jsonb where id = 'a4387ec5-283d-4980-afa1-5498b3743a55';
update vendors set categories = '["Home Insurance"]'::jsonb where id = 'a024dd69-9a0b-42ad-8c6c-732dabc9bc0b';
update vendors set categories = '["Home Insurance"]'::jsonb where id = '9f06ece4-bd9b-4949-9e1b-982bd68a8b4e';
update vendors set categories = '["Home Insurance"]'::jsonb where id = '3f4a8475-9c05-4b8c-badf-151f074f9e82';
update vendors set categories = '["Health & Life Insurance"]'::jsonb where id = '6ad3bc33-2269-4eaf-8fe5-8d59b3c81f0e';
update vendors set categories = '["Health & Life Insurance"]'::jsonb where id = '3b074071-4c3b-4bd5-9eaf-df3062c33142';
update vendors set categories = '["Health & Life Insurance"]'::jsonb where id = '15575452-5899-486d-9b9b-288818bf39b3';
update vendors set categories = '["Health & Life Insurance"]'::jsonb where id = 'ac32e2b0-7535-416f-8fbc-673aefca6356';
update vendors set categories = '["Tailoring & Seamstress"]'::jsonb where id = '4c2766e0-c605-4b8b-b554-6f4e468cd72a';
update vendors set categories = '["Tailoring & Seamstress"]'::jsonb where id = '97cd3819-79e4-4543-96a3-0c22668deb0e';
update vendors set categories = '["Tailoring & Seamstress"]'::jsonb where id = '4e5db9a0-dd29-457b-b6c8-c08189a1c94f';
update vendors set categories = '["Hair Stylist"]'::jsonb where id = 'e7694d71-45a1-49e7-ab0c-44c3a73f0192';
update vendors set categories = '["Hair Stylist"]'::jsonb where id = 'b4894e7b-ea8e-4804-9254-0c7dc2a35cd3';
update vendors set categories = '["Hair Stylist"]'::jsonb where id = '40099578-d782-475f-988a-919a2d511c11';
update vendors set categories = '["Nails & Manicure"]'::jsonb where id = '7548c2b0-22e1-4ebb-933d-cdf49d3deceb';
update vendors set categories = '["Cat Sitting"]'::jsonb where id = '8651641e-ce0b-406d-96fd-b60edcad38d4';
update vendors set categories = '["Cat Sitting"]'::jsonb where id = '3b5afab4-f5ae-4bbd-bd15-e6f4ca3ca41e';
update vendors set categories = '["Dog Walking & Sitting"]'::jsonb where id = 'ae3dfe62-13b3-4400-a41c-917affeed5fb';
update vendors set categories = '["Dog Walking & Sitting"]'::jsonb where id = 'cb320381-5d38-4698-a929-1f5b597ec5de';
update vendors set categories = '["Dog Walking & Sitting"]'::jsonb where id = '7572bd01-f9f9-403c-b9fe-28851ccfea03';
update vendors set categories = '["Dog Walking & Sitting"]'::jsonb where id = 'c1f26a38-c164-40c8-9df5-dfe7644ed74b';
update vendors set categories = '["Pet Grooming"]'::jsonb where id = '5ebe150e-442e-4032-b523-5b4d38e0fb38';
update vendors set categories = '["Pet Grooming"]'::jsonb where id = 'ef802aa3-06fd-4a99-8647-5b9bcc5f289b';
update vendors set categories = '["Pet Grooming"]'::jsonb where id = '9ec42988-22b7-4de0-802d-8e62cea24f3d';
update vendors set categories = '["Pet Grooming"]'::jsonb where id = 'b1f5d73e-80e4-44ee-bc53-48da14662e75';
update vendors set categories = '["Dog Walking & Sitting"]'::jsonb where id = 'ae517c68-0e6d-43b5-a45c-a118a1fc571d';
update vendors set categories = '["Dog Walking & Sitting"]'::jsonb where id = '2c587bef-03b7-45c3-a548-3999e397428b';
update vendors set categories = '["Pet Grooming"]'::jsonb where id = '33497ac4-353c-4cec-a9ef-08277d0bfd7e';
update vendors set categories = '["Pet Grooming"]'::jsonb where id = '621e3516-500d-4f28-b87f-c51137004a5a';
update vendors set categories = '["Pet Grooming"]'::jsonb where id = 'de6ca2b2-7ca9-4d46-adee-be45bab9e41a';
update vendors set categories = '["Pet Grooming"]'::jsonb where id = '42f7a14d-ec01-498e-b11e-8d27636f20ef';
update vendors set categories = '["Real Estate Services"]'::jsonb where id = '65146aa8-7e30-4ffd-bb4d-6e7cfa609da8';
update vendors set categories = '["Real Estate Services"]'::jsonb where id = '45890390-0532-4c79-903b-01d9ed32dea1';
update vendors set categories = '["Tutoring & Lessons"]'::jsonb where id = 'cc930753-e718-4afe-82b3-d3f0bf8d4efb';
update vendors set categories = '["Notary"]'::jsonb where id = '8cc9a0a2-99e3-4287-a533-950d3f03772a';
update vendors set categories = '["Notary"]'::jsonb where id = 'f9d8397b-dc55-48bb-8633-8f4acd8ad145';
update vendors set categories = '["Real Estate Services"]'::jsonb where id = '5225f133-195d-4553-8974-5f2a01a7204a';
update vendors set categories = '["Tutoring & Lessons"]'::jsonb where id = '8183f2cc-f585-4267-97f7-f8ae13607331';
update vendors set categories = '["Tutoring & Lessons"]'::jsonb where id = '1ff4d529-b185-450d-bc77-959137530276';
update vendors set categories = '["Legal"]'::jsonb where id = 'a917b30e-52f5-4505-ba7b-263d9bcb2ca6';
update vendors set categories = '["Notary"]'::jsonb where id = 'ccf0762a-54d1-476b-928a-0f8c9689e612';
update vendors set categories = '["Tutoring & Lessons"]'::jsonb where id = '78f78d60-df01-432c-ab29-0a3587875679';

-- Any vendor the backfill above didn't reach (added after this migration
-- was written, or somehow missed) keeps at least its old single category
-- instead of being left with an empty array.
update vendors
  set categories = jsonb_build_array(category)
  where categories = '[]'::jsonb and category is not null;

-- The full granular taxonomy, replacing the old 9-bucket list, for the
-- one live neighborhood. New neighborhoods going forward start from the
-- same list via DEFAULT_CATEGORIES in CreateNeighborhood.jsx.
update neighborhoods
set categories = '["Plumbing","HVAC","Electrical","Handyman","Landscaping","Flooring","Windows","Window Treatments","Fencing","Painting","Railings","Appliance Repair","Pest Control","Remodeling","Countertops & Stonework","Pool","Roofing","Security","Tree Service","Pressure Washing","House Cleaning","Air Duct & Dryer Vent Cleaning","Office & Commercial Cleaning","Auto Repair","Rideshare & Transportation","Boat Rental & Marine","Home Insurance","Health & Life Insurance","Hair Stylist","Tailoring & Seamstress","Nails & Manicure","Pet Grooming","Dog Walking & Sitting","Cat Sitting","Notary","Legal","Real Estate Services","Tutoring & Lessons","Food","Health & Wellness"]'::jsonb
where slug = 'antilles-at-islands-at-doral';
