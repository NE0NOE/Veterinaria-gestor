
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Configura el cliente de Supabase con la Service Role Key.
// Esta clave es muy poderosa y solo debe usarse en entornos seguros como las Edge Functions.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // action: 'add', 'delete', 'update_profile'
    // userData: { email, password, nombre, telefono, rolId, specialty } (para 'add')
    // userId: ID del usuario a eliminar/actualizar (para 'delete', 'update_profile')
    // updateData: { nombre, email, telefono } (para 'update_profile')
    // newRoleId: Nuevo ID de rol (para 'update_profile')
    // specialty: Especialidad si el rol es veterinario (para 'add' o 'update_profile')
    const { action, userData, userId, updateData, newRoleId, specialty } = await req.json()

    // --- Autenticación y Autorización del Admin (Esencial para la seguridad) ---
    // Verifica que la solicitud proviene de un administrador autenticado.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.split('Bearer ')[1]
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error in Edge Function:', authError?.message || 'User not found for token');
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Usar el cliente de Supabase (con Service Role Key) para verificar el rol del usuario que hizo la llamada
    const { data: userRoleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('id_rol')
      .eq('id_user', user.id)
      .single()

    if (roleError || !userRoleData) {
      console.error('Error fetching caller user role in Edge Function:', roleError?.message);
      return new Response(JSON.stringify({ error: 'Forbidden: Could not determine caller user role' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: roleNameData, error: roleNameError } = await supabaseAdmin
      .from('roles')
      .select('nombre')
      .eq('id_rol', userRoleData.id_rol)
      .single()

    if (roleNameError || roleNameData?.nombre !== 'admin') {
      console.warn(`Attempted unauthorized action by user ${user.id} with role: ${roleNameData?.nombre}`);
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can perform this action' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    // --- Fin de Autenticación y Autorización ---


    // --- Lógica de Acciones de Gestión de Usuarios ---
    let result;
    switch (action) {
      case 'add':
        const { email, password, nombre, telefono, rolId: addRoleId, specialty: addSpecialty } = userData;
        
        // Obtener el nombre del rol para el nuevo usuario
        const { data: newAddRoleData, error: newAddRoleError } = await supabaseAdmin.from('roles').select('nombre').eq('id_rol', addRoleId).single();
        if (newAddRoleError) throw new Error(`Failed to fetch new role name: ${newAddRoleError.message}`);
        const newAddRoleName = newAddRoleData?.nombre;

        // 1. Crear el usuario en Supabase Auth (requiere Service Role Key)
        const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirma el email
          user_metadata: { nombre_completo: nombre },
        });

        if (createUserError) {
          console.error('Edge Function - Create Auth User Error:', createUserError.message);
          return new Response(JSON.stringify({ error: `Failed to create auth user: ${createUserError.message}` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const newAuthUserId = authUser.user?.id;
        if (!newAuthUserId) {
          return new Response(JSON.stringify({ error: 'Failed to get new user ID after creation.' }), { status: 500 });
        }

        // 2. Insertar en `public.users`
        const { error: insertUserError } = await supabaseAdmin
          .from('users')
          .insert({
            id_user: newAuthUserId,
            nombre: nombre,
            email: email,
            telefono: telefono,
            activo: true,
          });

        if (insertUserError) {
          console.error('Edge Function - Insert public.users Error:', insertUserError.message);
          await supabaseAdmin.auth.admin.deleteUser(newAuthUserId); // Intentar revertir la creación de la cuenta Auth
          return new Response(JSON.stringify({ error: `Failed to insert user into public.users: ${insertUserError.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // 3. Insertar en `public.user_roles`
        const { error: insertUserRoleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            id_user: newAuthUserId,
            id_rol: addRoleId,
          });

        if (insertUserRoleError) {
          console.error('Edge Function - Insert public.user_roles Error:', insertUserRoleError.message);
          // La cuenta Auth y el registro en public.users ya existen. Considerar limpieza manual o triggers si esto falla.
          return new Response(JSON.stringify({ error: `Failed to assign user role: ${insertUserRoleError.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // 4. Insertar en tablas específicas de rol (veterinarios o clientes)
        if (newAddRoleName === 'veterinario') {
          const { error: insertVetError } = await supabaseAdmin
            .from('veterinarios')
            .insert({
              id_user: newAuthUserId,
              nombre: nombre,
              email: email,
              telefono: telefono,
              especialidad: addSpecialty,
            });
          if (insertVetError) {
            console.error('Edge Function - Insert public.veterinarios Error:', insertVetError.message);
            return new Response(JSON.stringify({ error: `Failed to create veterinarian profile: ${insertVetError.message}` }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        } else if (newAddRoleName === 'cliente') {
           const { error: insertClientError } = await supabaseAdmin
             .from('clientes')
             .insert({
               id_user: newAuthUserId,
               nombre: nombre,
               email: email,
               telefono: telefono,
             });
           if (insertClientError) {
             console.error('Edge Function - Insert public.clientes Error:', insertClientError.message);
             return new Response(JSON.stringify({ error: `Failed to create client profile: ${insertClientError.message}` }), {
               status: 500,
               headers: { 'Content-Type': 'application/json' },
             });
           }
        }
        
        result = { success: true, message: `Usuario ${nombre} (${newAddRoleName}) agregado exitosamente.` };
        break;

      case 'delete':
        if (!userId) {
          return new Response(JSON.stringify({ error: 'User ID is required for deletion.' }), { status: 400 });
        }

        // Obtener el rol actual del usuario para limpiar tablas relacionadas antes de eliminar auth.users
        const { data: userToDeleteRoles, error: userToDeleteRoleError } = await supabaseAdmin
          .from('user_roles')
          .select('id_rol, roles(nombre)')
          .eq('id_user', userId)
          .single();

        if (userToDeleteRoleError) {
          console.warn(`Could not determine role for user ${userId} during deletion: ${userToDeleteRoleError.message}`);
        }

        const roleToDeleteName = userToDeleteRoles?.roles?.nombre;

        // 1. Eliminar de tablas específicas de rol
        if (roleToDeleteName === 'veterinario') {
          await supabaseAdmin.from('veterinarios').delete().eq('id_user', userId);
        } else if (roleToDeleteName === 'cliente') {
          await supabaseAdmin.from('clientes').delete().eq('id_user', userId);
        }

        // 2. Eliminar de public.user_roles y public.users
        await supabaseAdmin.from('user_roles').delete().eq('id_user', userId);
        await supabaseAdmin.from('users').delete().eq('id_user', userId);

        // 3. Eliminar el usuario de Supabase Auth (requiere Service Role Key)
        const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteUserError) {
          console.error('Edge Function - Delete Auth User Error:', deleteUserError.message);
          return new Response(JSON.stringify({ error: `Failed to delete auth user: ${deleteUserError.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        result = { success: true, message: `Usuario con ID ${userId} eliminado exitosamente.` };
        break;

      case 'update_profile':
        if (!userId || !updateData) {
          return new Response(JSON.stringify({ error: 'User ID and update data are required.' }), { status: 400 });
        }
        
        // Actualizar email en Auth si es diferente (requiere Service Role Key)
        const currentAuthUser = await supabaseAdmin.auth.admin.getUserById(userId);
        if (updateData.email && updateData.email !== currentAuthUser.data.user?.email) {
            const { error: updateAuthUserError } = await supabaseAdmin.auth.admin.updateUserById(
                userId,
                { email: updateData.email }
            );
            if (updateAuthUserError) {
                console.error('Edge Function - Update Auth User Email Error:', updateAuthUserError.message);
                throw new Error(`Failed to update auth user email: ${updateAuthUserError.message}`);
            }
        }
        // Nota: Para la contraseña, se recomienda un flujo de restablecimiento de contraseña en lugar de cambiarla directamente desde el admin.
        // Si aún así quieres que el admin pueda cambiarla:
        // if (updateData.password) {
        //     const { error: updateAuthPasswordError } = await supabaseAdmin.auth.admin.updateUserById(
        //         userId, { password: updateData.password }
        //     );
        //     if (updateAuthPasswordError) throw new Error(`Failed to update auth password: ${updateAuthPasswordError.message}`);
        // }


        // 1. Actualizar `public.users`
        const { error: updateUserError } = await supabaseAdmin
          .from('users')
          .update(updateData) // updateData contiene nombre, email, telefono
          .eq('id_user', userId);

        if (updateUserError) {
          console.error('Edge Function - Update public.users Error:', updateUserError.message);
          return new Response(JSON.stringify({ error: `Failed to update user profile: ${updateUserError.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // 2. Actualizar `public.user_roles` si se cambió el rol
        if (newRoleId) {
          const { data: oldUserRoleData, error: oldUserRoleError } = await supabaseAdmin
            .from('user_roles')
            .select('id_rol, roles(nombre)')
            .eq('id_user', userId)
            .single();

          if (oldUserRoleError) throw new Error(`Failed to fetch old user role: ${oldUserRoleError.message}`);

          const oldRoleId = oldUserRoleData?.id_rol;
          const oldRoleName = oldUserRoleData?.roles?.nombre;

          const { data: newRoleData, error: newRoleError } = await supabaseAdmin.from('roles').select('nombre').eq('id_rol', newRoleId).single();
          if (newRoleError) throw new Error(`Failed to fetch new role name: ${newRoleError.message}`);
          const newRoleName = newRoleData?.nombre;

          if (oldRoleId !== newRoleId) { // Si el rol realmente cambió
            // Actualizar la asignación de rol en user_roles
            const { error: updateUserRoleError } = await supabaseAdmin
              .from('user_roles')
              .update({ id_rol: newRoleId })
              .eq('id_user', userId);

            if (updateUserRoleError) {
              console.error('Edge Function - Update public.user_roles Error:', updateUserRoleError.message);
              throw new Error(`Failed to update user role: ${updateUserRoleError.message}`);
            }

            // Limpiar el perfil antiguo y crear el nuevo si aplica la transición de rol
            if (oldRoleName === 'veterinario') {
              await supabaseAdmin.from('veterinarios').delete().eq('id_user', userId);
            } else if (oldRoleName === 'cliente') {
              await supabaseAdmin.from('clientes').delete().eq('id_user', userId);
            }

            if (newRoleName === 'veterinario') {
              const { error: insertVetError } = await supabaseAdmin
                .from('veterinarios')
                .insert({
                  id_user: userId,
                  nombre: updateData.nombre,
                  email: updateData.email,
                  telefono: updateData.telefono,
                  especialidad: specialty,
                });
              if (insertVetError) throw new Error(`Failed to create new veterinarian profile: ${insertVetError.message}`);
            } else if (newRoleName === 'cliente') {
              const { error: insertClientError } = await supabaseAdmin
                .from('clientes')
                .insert({
                  id_user: userId,
                  nombre: updateData.nombre,
                  email: updateData.email,
                  telefono: updateData.telefono,
                });
              if (insertClientError) throw new Error(`Failed to create new client profile: ${insertClientError.message}`);
            }
          } else if (newRoleName === 'veterinario' && specialty !== undefined && specialty !== (await supabaseAdmin.from('veterinarios').select('especialidad').eq('id_user', userId).single()).data?.especialidad) {
             // Si el rol es veterinario y la especialidad se actualiza (o no cambia el rol pero sí la especialidad)
             const { error: updateVetError } = await supabaseAdmin
                .from('veterinarios')
                .update({ especialidad: specialty })
                .eq('id_user', userId);
             if (updateVetError) throw new Error(`Failed to update veterinarian specialty: ${updateVetError.message}`);
          }
        }
        result = { success: true, message: `Usuario con ID ${userId} actualizado exitosamente.` };
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid action.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Edge Function unexpected error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
})