<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Auth\Access\HandlesAuthorization;

class TenantPolicy
{
    use HandlesAuthorization;

    /**
     * Determine if the user can view any models.
     */
    public function viewAny(User $user)
    {
        return true; // Global Scope handles filtering individual rows
    }

    /**
     * Determine if the user can view the model.
     */
    public function view(User $user, Model $model)
    {
        return $this->isOwner($user, $model);
    }

    /**
     * Determine if the user can create models.
     */
    public function create(User $user)
    {
        return true; // BelongsToStore trait ensures store_id is set
    }

    /**
     * Determine if the user can update the model.
     */
    public function update(User $user, Model $model)
    {
        return $this->isOwner($user, $model);
    }

    /**
     * Determine if the user can delete the model.
     */
    public function delete(User $user, Model $model)
    {
        return $this->isOwner($user, $model);
    }

    /**
     * Internal check for store ownership.
     */
    protected function isOwner(User $user, Model $model)
    {
        // Super Admins have global access
        if ($user->role === User::ROLE_SUPER_ADMIN) {
            return true;
        }

        // Branch Users must match store_id
        return $user->store_id === $model->store_id;
    }
}
