-- Controller: auth
-- File: queries.sql
-- Runtime PostgreSQL query registry loaded by backend/src/utils/sqlFileLoader.js
-- Used by backend/src/controllers/authController.js; fetches authentication and signup data from users, rider, admin, rider_requests, and region tables.

-- context: auth ordinary query
-- functionality: Executes SQL block 'q_0001' for auth controller runtime.
-- name: q_0001
-- used-by: backend/src/controllers/authController.js -> exports.signup()
-- touches: users
select coalesce(
   max(user_id),
   0
) + 1 as next_id
  from users;

-- context: auth ordinary query
-- functionality: Executes SQL block 'lookup_users_by_email' for auth controller runtime.
-- name: lookup_users_by_email
-- used-by: backend/src/controllers/authController.js -> no direct exports.<fn>() reference found
-- touches: users
select *
  from users
 where email = $1;

-- context: auth ordinary query
-- functionality: Executes SQL block 'lookup_rider_by_email' for auth controller runtime.
-- name: lookup_rider_by_email
-- used-by: backend/src/controllers/authController.js -> no direct exports.<fn>() reference found
-- touches: rider
select *
  from rider
 where email = $1;

-- context: auth ordinary query
-- functionality: Executes SQL block 'lookup_admin_by_email' for auth controller runtime.
-- name: lookup_admin_by_email
-- used-by: backend/src/controllers/authController.js -> no direct exports.<fn>() reference found
-- touches: admin
select *
  from admin
 where email = $1;

-- context: auth ordinary query
-- functionality: Executes SQL block 'exists_users_by_email' for auth controller runtime.
-- name: exists_users_by_email
-- used-by: backend/src/controllers/authController.js -> no direct exports.<fn>() reference found
-- touches: users
select 1
  from users
 where email = $1;

-- context: auth ordinary query
-- functionality: Executes SQL block 'exists_rider_by_email' for auth controller runtime.
-- name: exists_rider_by_email
-- used-by: backend/src/controllers/authController.js -> no direct exports.<fn>() reference found
-- touches: rider
select 1
  from rider
 where email = $1;

-- context: auth ordinary query
-- functionality: Executes SQL block 'exists_admin_by_email' for auth controller runtime.
-- name: exists_admin_by_email
-- used-by: backend/src/controllers/authController.js -> no direct exports.<fn>() reference found
-- touches: admin
select 1
  from admin
 where email = $1;

-- context: auth ordinary query
-- functionality: Executes SQL block 'exists_rider_requests_by_email' for auth controller runtime.
-- name: exists_rider_requests_by_email
-- used-by: backend/src/controllers/authController.js -> no direct exports.<fn>() reference found
-- touches: rider_requests
select 1
  from rider_requests
 where email = $1;

-- context: auth ordinary query
-- functionality: Executes SQL block 'insert_signup_user' for auth controller runtime.
-- name: insert_signup_user
-- used-by: backend/src/controllers/authController.js -> exports.signup()
-- touches: users
insert into users (
   user_id,
   name,
   email,
   password_hash,
   phone,
   region_id,
   home_region_id,
   created_at
) values ( $1,
           $2,
           $3,
           $4,
           $5,
           $6,
           $6,
           now() );

-- context: auth ordinary query
-- functionality: Executes SQL block 'select_signup_user_by_id' for auth controller runtime.
-- name: select_signup_user_by_id
-- used-by: backend/src/controllers/authController.js -> exports.signup()
-- touches: users
select user_id,
       name,
       email,
       phone,
       region_id
  from users
 where user_id = $1;

-- context: auth ordinary query
-- functionality: Executes SQL block 'insert_signup_rider_request' for auth controller runtime.
-- name: insert_signup_rider_request
-- used-by: backend/src/controllers/authController.js -> exports.signup()
-- touches: rider_requests
insert into rider_requests (
   name,
   email,
   password_hash,
   phone,
   appointment_code,
   region_id,
   status,
   created_at
) values ( $1,
           $2,
           $3,
           $4,
           $5,
           $6,
           'pending',
           now() );

-- context: auth ordinary query
-- functionality: Executes SQL block 'select_latest_rider_request_by_email' for auth controller runtime.
-- name: select_latest_rider_request_by_email
-- used-by: backend/src/controllers/authController.js -> exports.signup()
-- touches: rider_requests
select request_id,
       name,
       email,
       phone,
       region_id
  from rider_requests
 where request_id = (
   select max(request_id)
     from rider_requests
    where email = $1
);

-- context: auth ordinary query
-- functionality: Checks whether a region_id exists in region table.
-- name: exists_region_by_id
-- used-by: backend/src/controllers/authController.js -> exports.signup()
-- touches: region
select 1
  from region
 where region_id = $1;

-- context: auth ordinary query
-- functionality: Returns all predefined regions for signup/checkout selection.
-- name: select_regions
-- used-by: backend/src/controllers/authController.js -> exports.getRegions()
-- touches: region
select region_id,
       region_name
  from region
 where region_id <> 6
 order by region_name asc;

-- context: auth ordinary query
-- functionality: Restores a user's active region from their home region on logout.
-- name: reset_user_region_on_logout
-- used-by: backend/src/controllers/authController.js -> exports.logout()
-- touches: users
update users
   set
   region_id = coalesce(
      home_region_id,
      region_id
   )
 where user_id = $1;