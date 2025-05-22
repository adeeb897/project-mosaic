/**
 * Permission model for authorization
 */
export interface Permission {
  /**
   * Unique identifier for the permission
   */
  id: string;

  /**
   * Resource that this permission applies to
   */
  resource: string;

  /**
   * Action that can be performed on the resource
   */
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
}
